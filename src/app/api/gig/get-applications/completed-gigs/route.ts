//api/gig/get-applications/completed-gigs/?user_id
import { prisma } from "@/src/app/lib/db";
import { isLoggedIn } from "@/src/app/actions/login";
import { NextResponse, NextRequest } from "next/server";
import { getRoleFromPayload, getUserIdFromPayload } from "@/src/app/actions/login";
import { GIG_COMPLETION_STATUS } from "@/src/constants/appConstants";

/**
 * Get all completed gigs for a user
 * @param req Request object
 * @returns A list of completed gigs for user
 * @author alhonaut
 */
export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const user_id = parseInt(searchParams.get("user_id") || "0");
    const payloadUserId = await getUserIdFromPayload();
    const payloadUserRole = await getRoleFromPayload();

    // check user authentication
    if (!await isLoggedIn()) {
        return NextResponse.json(
            { message: "User not authenticated." },
            { status: 401 }
        )
    }

    if (!user_id) {
        return NextResponse.json(
            { message: "Invalid user_id provided." },
            { status: 400 }
        )
    }

    if (payloadUserId !== user_id) {
        return NextResponse.json(
            { message: "User don't have access to data." },
            { status: 401 }
        )
    }

    let whereClause = {};
    if (payloadUserRole === "Client") {
        whereClause = {
            clientId: user_id,
            completionStatus: GIG_COMPLETION_STATUS.COMPLETE,
        };
    } else if (payloadUserRole === "Freelancer") {
        whereClause = {
            freelancerId: user_id,
            completionStatus: GIG_COMPLETION_STATUS.COMPLETE,
        };
    }

    // retrieve data from Database for client
    const completedGigs = await prisma.gig.findMany({
        where: whereClause,
        include: {
            gig_task: true,
            gig_file: true,
            user: true,
        },
    });

    if (!completedGigs.length) {
        return NextResponse.json(
            { message: "No completed gigs found for client." },
            { status: 404 }
        );
    }

    // changed `bigint` into `string` for resolving issue with serialization BigInt from TypeScript
    return NextResponse.json(JSON.stringify(completedGigs, (key, value) =>
        typeof value === 'bigint'
            ? value.toString()
            : value
    ), { status: 200 });
}