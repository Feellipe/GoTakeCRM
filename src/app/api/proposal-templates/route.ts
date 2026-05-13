import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { validateOrThrow, ValidationError, validationErrorResponse, proposalTemplateCreateSchema, validateOrigin } from '@/lib/validations';

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
    if (!validateOrigin(request)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const rawBody = await request.json();
    const body = validateOrThrow(proposalTemplateCreateSchema, rawBody);

    const template = await db.proposalTemplate.create({
      data: {
        name: body.name,
        description: body.description ?? null,
        defaultTerms: body.defaultTerms ?? null,
        defaultPackages: body.defaultPackages ?? null,
        coverImage: body.coverImage ?? null,
        isActive: body.isActive,
      },
    });
    return NextResponse.json(template, { status: 201 });
  } catch (error) {
    if (error instanceof ValidationError) {
      return validationErrorResponse(error);
    }
    console.error('Error creating template:', error);
    return NextResponse.json({ error: 'Failed to create template' }, { status: 500 });
  }
}
