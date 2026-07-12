# Architecture Notes

## Curriculum admin

Curriculum data is modeled as reusable templates:

- `CurriculumBoard`
- `CurriculumVersion`
- `CurriculumClass`
- `CurriculumSubject`
- `CurriculumChapter`
- `CurriculumTopic`

Parents can manage templates at `/admin/curriculum`. Draft versions are editable, published versions are read-only, and archived versions are retained for history.

## Add Kid assignment flow

When a parent adds a child, the form can optionally select a published curriculum version and class. On save, the app snapshots the chosen subjects, chapters, and topics into the child-owned tree.

That snapshot keeps the child record independent from later template edits. The child can keep studying even if the template changes afterward.

## Import flow

Curriculum import supports:

- JSON seed files
- detailed CSV exports
- dry-run validation
- idempotent re-imports

The canonical import command is:

```bash
npm run curriculum:seed
```

## Seed review notes

The CBSE seed is treated as curated curriculum metadata, not a guaranteed official copy. Imported rows should be reviewed before publishing when the verification status is `REVIEW_REQUIRED`.

## Local and production setup

- Local development uses `.env` and the Docker Compose PostgreSQL service.
- Production should use hosted PostgreSQL and Clerk environment variables from the deployment provider.
- The same environment variable names should be kept in both places so Prisma and Next.js behave consistently.
