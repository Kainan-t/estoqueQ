-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Profiles (extends Supabase auth.users)
create table public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  nome text not null,
  cargo text not null check (cargo in ('admin', 'operador')),
  created_at timestamptz default now()
);

-- Trigger: auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, nome, cargo)
  values (new.id, coalesce(new.raw_user_meta_data->>'nome', new.email), 'operador');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Materias primas
create table public.materias_primas (
  id uuid default uuid_generate_v4() primary key,
  nome text not null unique,
  unidade text not null default 'kg',
  estoque_minimo numeric(10,2) not null default 0,
  created_at timestamptz default now()
);

-- Movimentacoes de MP
create table public.movimentacoes_mp (
  id uuid default uuid_generate_v4() primary key,
  materia_prima_id uuid references public.materias_primas(id) not null,
  tipo text not null check (tipo in ('entrada', 'saida')),
  quantidade numeric(10,2) not null check (quantidade > 0),
  data date not null default current_date,
  usuario_id uuid references auth.users(id) not null,
  observacao text,
  created_at timestamptz default now()
);

-- Produtos finalizados
create table public.produtos_finalizados (
  id uuid default uuid_generate_v4() primary key,
  nome text not null unique,
  created_at timestamptz default now()
);

-- Movimentacoes de PF
create table public.movimentacoes_pf (
  id uuid default uuid_generate_v4() primary key,
  produto_id uuid references public.produtos_finalizados(id) not null,
  tipo text not null check (tipo in ('producao', 'expedicao')),
  metros_por_caixa numeric(10,2),
  cx_verdes integer not null default 0 check (cx_verdes >= 0),
  cx_amarelas integer not null default 0 check (cx_amarelas >= 0),
  cx_vermelhas integer not null default 0 check (cx_vermelhas >= 0),
  data date not null default current_date,
  usuario_id uuid references auth.users(id) not null,
  observacao text,
  created_at timestamptz default now()
);

-- Configuracoes de qualidade
create table public.configuracoes_qualidade (
  id uuid default uuid_generate_v4() primary key,
  cor text not null unique check (cor in ('verde', 'amarelo', 'vermelho')),
  descricao text not null
);

-- =====================
-- SEED DATA
-- =====================
insert into public.configuracoes_qualidade (cor, descricao) values
  ('verde', 'Aprovado'),
  ('amarelo', 'Aprovado com restrição'),
  ('vermelho', 'Reprovado');

insert into public.materias_primas (nome, unidade, estoque_minimo) values
  ('Acetato de Etila', 'kg', 100),
  ('Acetato de Butila', 'kg', 100),
  ('Tolueno', 'kg', 50),
  ('Catalizador', 'kg', 10),
  ('Inibidor', 'kg', 10),
  ('Resina PS', 'kg', 50),
  ('Resina SR', 'kg', 50);

insert into public.produtos_finalizados (nome) values
  ('05% DBK'),
  ('20% DBK'),
  ('50% DBK');
-- NOTE: Remaining ~20 products to be added before launch

-- =====================
-- ROW LEVEL SECURITY
-- =====================
alter table public.profiles enable row level security;
alter table public.materias_primas enable row level security;
alter table public.movimentacoes_mp enable row level security;
alter table public.produtos_finalizados enable row level security;
alter table public.movimentacoes_pf enable row level security;
alter table public.configuracoes_qualidade enable row level security;

-- All authenticated users can read
create policy "auth read profiles" on public.profiles for select using (auth.role() = 'authenticated');
create policy "auth read mp" on public.materias_primas for select using (auth.role() = 'authenticated');
create policy "auth read mov_mp" on public.movimentacoes_mp for select using (auth.role() = 'authenticated');
create policy "auth insert mov_mp" on public.movimentacoes_mp for insert with check (auth.uid() = usuario_id);
create policy "auth read pf" on public.produtos_finalizados for select using (auth.role() = 'authenticated');
create policy "auth read mov_pf" on public.movimentacoes_pf for select using (auth.role() = 'authenticated');
create policy "auth insert mov_pf" on public.movimentacoes_pf for insert with check (auth.uid() = usuario_id);
create policy "auth read qualidade" on public.configuracoes_qualidade for select using (auth.role() = 'authenticated');

-- Admin-only write on config tables
create policy "admin update mp" on public.materias_primas for update
  using (exists (select 1 from public.profiles where id = auth.uid() and cargo = 'admin'));
create policy "admin insert mp" on public.materias_primas for insert
  with check (exists (select 1 from public.profiles where id = auth.uid() and cargo = 'admin'));
create policy "admin update pf" on public.produtos_finalizados for update
  using (exists (select 1 from public.profiles where id = auth.uid() and cargo = 'admin'));
create policy "admin insert pf" on public.produtos_finalizados for insert
  with check (exists (select 1 from public.profiles where id = auth.uid() and cargo = 'admin'));
create policy "admin update qualidade" on public.configuracoes_qualidade for update
  using (exists (select 1 from public.profiles where id = auth.uid() and cargo = 'admin'));
create policy "admin update profiles" on public.profiles for update
  using (exists (select 1 from public.profiles where id = auth.uid() and cargo = 'admin'));
create policy "user update own profile" on public.profiles for update
  using (id = auth.uid());
