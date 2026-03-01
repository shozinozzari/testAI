import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
    // Get country from Cloudflare/Vercel headers
    let country = request.headers.get('x-vercel-ip-country') || request.headers.get('cf-ipcountry');

    // FALLBACK FOR LOCAL DEV:
    if (!country && request.headers.get('host')?.includes('localhost')) {
        country = 'IN';
    }

    country = country || 'US';

    // Clone the request headers and set a new header `x-country`
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-country', country);

    // You can also set a cookie for client-side access if needed
    const response = NextResponse.next({
        request: {
            headers: requestHeaders,
        },
    });

    // Set a cookie so client components can easily read it
    response.cookies.set('user-country', country, { httpOnly: false });

    return response;
}

export const config = {
    matcher: [
        // Match all request paths except for the ones starting with:
        // - api (API routes)
        // - _next/static (static files)
        // - _next/image (image optimization files)
        // - favicon.ico (favicon file)
        '/((?!api|_next/static|_next/image|favicon.ico).*)',
    ],
};
