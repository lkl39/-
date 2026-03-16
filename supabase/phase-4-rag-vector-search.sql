create extension if not exists vector;

alter table public.knowledge_base
  add column if not exists embedding vector(1536);

create index if not exists knowledge_base_embedding_idx
  on public.knowledge_base
  using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

create or replace function public.match_knowledge_base(
  query_embedding vector(1536),
  match_count integer default 8
)
returns table (
  title text,
  category text,
  keywords text,
  symptom text,
  possible_cause text,
  solution text,
  source text,
  similarity double precision
)
language sql
stable
as $$
  select
    kb.title,
    kb.category,
    kb.keywords,
    kb.symptom,
    kb.possible_cause,
    kb.solution,
    kb.source,
    1 - (kb.embedding <=> query_embedding) as similarity
  from public.knowledge_base kb
  where kb.embedding is not null
  order by kb.embedding <=> query_embedding
  limit greatest(match_count, 1);
$$;
