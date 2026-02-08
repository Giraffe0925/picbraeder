import { NextRequest, NextResponse } from 'next/server';
import { SUZURI_CONFIG } from '@/lib/suzuri/config';

/**
 * SUZURI API プロキシ
 * クライアントから画像を受け取り、SUZURI に商品を作成
 */
export async function POST(req: NextRequest) {
    try {
        const { imageBase64, title } = await req.json();

        const apiKey = process.env.SUZURI_API_KEY;
        if (!apiKey) {
            return NextResponse.json(
                { error: 'SUZURI API key not configured' },
                { status: 500 }
            );
        }

        // SUZURI Material API を呼び出し
        const res = await fetch(`${SUZURI_CONFIG.apiBase}/materials`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                texture: imageBase64,
                title: title || 'Picbraeder Keychain',
                description: 'Generated from a pattern evolved in Picbraeder',
                price: 0,
                products: SUZURI_CONFIG.defaultItems.map(itemId => ({
                    itemId,
                    published: true,
                })),
            }),
        });

        if (!res.ok) {
            const errorData = await res.json().catch(() => ({}));
            console.error('SUZURI API error:', res.status, errorData);
            return NextResponse.json(
                { error: 'SUZURI API error', details: errorData },
                { status: res.status }
            );
        }

        const data = await res.json();

        const product = data.products?.[0];
        const productUrl = product?.sampleUrl || product?.url;

        return NextResponse.json({
            success: true,
            productUrl,
            materialId: data.id,
            products: data.products,
        });
    } catch (error) {
        console.error('SUZURI API route error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
