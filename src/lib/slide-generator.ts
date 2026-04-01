import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

interface StorySection {
  chapterId: string
  sectionId: string
  sectionTitle: string
  catchCopy?: string
  essentiallyLine?: string
  body?: string
  editorNote?: string
  visualSuggestion?: string
}

interface StoryChapter {
  chapterId: string
  chapterTitle: string
  role?: string
}

interface StoryOutput {
  conceptWords?: Array<{ copy: string; rationale: string }>
  storyLine?: StoryChapter[]
  sections?: StorySection[]
}

export async function generateSlides(versionId: string) {
  const version = await prisma.proposalVersion.findUnique({
    where: { id: versionId },
    include: {
      executions: {
        where: { status: 'COMPLETED', agentId: 'AG-07' },
        include: { results: true },
        orderBy: { startedAt: 'desc' },
        take: 1,
      },
    },
  })
  if (!version) throw new Error('Version not found')

  const ag07Result = version.executions[0]?.results[0]
  if (!ag07Result) throw new Error('AG-07 result not found')

  const story: StoryOutput = JSON.parse(ag07Result.editedJson ?? ag07Result.outputJson)
  type SlideData = {
    versionId: string
    slideNumber: number
    chapterId: string
    sectionId: string
    title: string
    catchCopy: string | null
    body: string
    slideType: string
    layoutHint: string | null
  }
  const slides: SlideData[] = []
  let slideNumber = 1

  // Cover slide
  slides.push({
    versionId,
    slideNumber: slideNumber++,
    chapterId: 'cover',
    sectionId: 'cover',
    title: story.conceptWords?.[0]?.copy ?? '提案書',
    catchCopy: story.conceptWords?.[0]?.rationale ?? null,
    body: '',
    slideType: 'COVER',
    layoutHint: 'cover-full',
  })

  // TOC slide
  slides.push({
    versionId,
    slideNumber: slideNumber++,
    chapterId: 'toc',
    sectionId: 'toc',
    title: '目次',
    catchCopy: null,
    body: (story.storyLine ?? []).map((ch, i) => `${i + 1}. ${ch.chapterTitle}`).join('\n'),
    slideType: 'TABLE_OF_CONTENTS',
    layoutHint: 'toc',
  })

  // Chapter slides
  const sections = story.sections ?? []
  for (const section of sections) {
    const chapter = story.storyLine?.find(ch => ch.chapterId === section.chapterId)

    // Chapter title slide (first section in chapter)
    const isFirstInChapter = sections.filter(s => s.chapterId === section.chapterId)[0]?.sectionId === section.sectionId
    if (isFirstInChapter && chapter) {
      slides.push({
        versionId,
        slideNumber: slideNumber++,
        chapterId: section.chapterId,
        sectionId: 'chapter-title',
        title: chapter.chapterTitle,
        catchCopy: chapter.role ?? null,
        body: '',
        slideType: 'CHAPTER_TITLE',
        layoutHint: 'chapter-title',
      })
    }

    // Content slide
    const bodyParts = [
      section.essentiallyLine,
      section.essentiallyLine ? '---' : null,
      section.body,
      section.editorNote ? `※ ${section.editorNote}` : null,
    ].filter(Boolean)

    const vs = section.visualSuggestion ?? ''
    const layoutHint = vs.startsWith('[数字') ? 'number-hero'
      : vs.startsWith('[比較') ? 'two-column'
      : 'text-main'

    slides.push({
      versionId,
      slideNumber: slideNumber++,
      chapterId: section.chapterId,
      sectionId: section.sectionId,
      title: section.sectionTitle,
      catchCopy: section.catchCopy ?? null,
      body: bodyParts.join('\n\n'),
      slideType: 'CONTENT',
      layoutHint,
    })
  }

  // Save to DB
  await prisma.proposalSlide.deleteMany({ where: { versionId } })
  await prisma.proposalSlide.createMany({ data: slides })

  return prisma.proposalSlide.findMany({
    where: { versionId },
    orderBy: { slideNumber: 'asc' },
  })
}
