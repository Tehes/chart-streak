/* --------------------------------------------------------------------------------------------------
constants
---------------------------------------------------------------------------------------------------*/
const APP_ORIGIN = "https://tehes.github.io";
const DEV_ORIGIN = "http://127.0.0.1:5500";
const DEEZER_TRACK_API_URL = "https://api.deezer.com/track/";
const ALLOWED_ORIGINS = new Set([
	APP_ORIGIN,
	DEV_ORIGIN,
]);

const BASE_CORS_HEADERS = {
	"Access-Control-Allow-Methods": "GET, POST, OPTIONS",
	"Access-Control-Allow-Headers": "Content-Type",
	"Vary": "Origin",
};

/* --------------------------------------------------------------------------------------------------
functions
---------------------------------------------------------------------------------------------------*/
function withCors(origin, headers = {}) {
	const corsHeaders = { ...BASE_CORS_HEADERS };
	if (origin && ALLOWED_ORIGINS.has(origin)) {
		corsHeaders["Access-Control-Allow-Origin"] = origin;
	}
	return { ...corsHeaders, ...headers };
}

function jsonResponse(body, origin, status = 200) {
	return new Response(JSON.stringify(body), {
		status,
		headers: withCors(origin, {
			"Content-Type": "application/json; charset=utf-8",
			"Cache-Control": "no-store",
		}),
	});
}

function textResponse(body, status, origin) {
	return new Response(body, {
		status,
		headers: withCors(origin, {
			"Content-Type": "text/plain; charset=utf-8",
			"Cache-Control": "no-store",
		}),
	});
}

function emptyResponse(origin, status = 204) {
	return new Response(null, {
		status,
		headers: withCors(origin, {
			"Cache-Control": "no-store",
		}),
	});
}

function getRequestContext(request) {
	const url = new URL(request.url);
	const origin = request.headers.get("origin");
	return { url, origin };
}

function isOriginAllowed(origin) {
	return ALLOWED_ORIGINS.has(origin);
}

/* --------------------------------------------------------------------------------------------------
route handlers
---------------------------------------------------------------------------------------------------*/
function handleOptions(origin) {
	return emptyResponse(origin);
}

function handleHealth(_request, origin) {
	return jsonResponse({ ok: true }, origin);
}

async function handleDeezerTrack(trackId, origin) {
	const response = await fetch(`${DEEZER_TRACK_API_URL}${trackId}`);
	if (!response.ok) {
		console.warn(`Deezer track request failed for ${trackId}: ${response.status}`);
		return jsonResponse({ error: "deezer_request_failed" }, origin, 502);
	}

	const track = await response.json();
	if (track?.error) {
		return jsonResponse({
			id: trackId,
			readable: false,
		}, origin);
	}

	return jsonResponse({
		id: trackId,
		readable: track.readable === true,
	}, origin);
}

/* --------------------------------------------------------------------------------------------------
routing
---------------------------------------------------------------------------------------------------*/
function routeRequest(request) {
	const { url, origin } = getRequestContext(request);

	if (!isOriginAllowed(origin)) {
		return textResponse("Forbidden", 403, origin);
	}

	if (request.method === "OPTIONS") {
		return handleOptions(origin);
	}

	if (url.pathname === "/health") {
		if (request.method !== "GET") {
			return textResponse("Method not allowed", 405, origin);
		}
		return handleHealth(request, origin);
	}

	const deezerTrackMatch = url.pathname.match(/^\/deezer-track\/(\d+)$/);
	if (deezerTrackMatch) {
		if (request.method !== "GET") {
			return textResponse("Method not allowed", 405, origin);
		}
		return handleDeezerTrack(deezerTrackMatch[1], origin);
	}

	if (url.pathname.startsWith("/deezer-track/")) {
		if (request.method !== "GET") {
			return textResponse("Method not allowed", 405, origin);
		}
		return textResponse("Invalid track id", 400, origin);
	}

	return textResponse("Not found", 404, origin);
}

/* --------------------------------------------------------------------------------------------------
server
---------------------------------------------------------------------------------------------------*/
Deno.serve(async (request) => {
	try {
		return await routeRequest(request);
	} catch (error) {
		console.error("Unexpected error", error);
		return textResponse(
			"Internal error",
			500,
			request.headers.get("origin"),
		);
	}
});
