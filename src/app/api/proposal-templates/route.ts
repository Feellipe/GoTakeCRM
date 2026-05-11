import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET all proposal templates
export async function GET() {
  try {
    const templates = await db.proposalTemplate.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'asc' },
      include: {
        _count: {
          select: { proposals: true },
        },
      },
    });
    return NextResponse.json(templates);
  } catch (error) {
    console.error('Error fetching proposal templates:', error);
    return NextResponse.json({ error: 'Failed to fetch templates' }, { status: 500 });
  }
}

// POST create new template
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const template = await db.proposalTemplate.create({
      data: {
        name: body.name,
        description: body.description,
        defaultTerms: body.defaultTerms,
        defaultPackages: body.defaultPackages ? JSON.stringify(body.defaultPackages) : null,
        coverImage: body.coverImage,
        isActive: true,
      },
    });
    return NextResponse.json(template);
  } catch (error) {
    console.error('Error creating template:', error);
    return NextResponse.json({ error: 'Failed to create template' }, { status: 500 });
  }
}
