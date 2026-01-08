import { Prisma } from '@prisma/client';

// Exemple de correction pour les types
const fullProjectSelect = {
  id: true,
  title: true,
  description: true,
  owner: {
    select: {
      id: true,
      email: true,
      name: true,
    },
  },
  members: {
    select: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
        },
      },
      role: true,
    },
  },
  tags: {
    select: {
      tag: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  },
  createdAt: true,
  updatedAt: true,
} as const;

type FullProjectPayload = Prisma.ProjectGetPayload<{
  select: typeof fullProjectSelect;
}>;
