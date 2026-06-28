import Footer from '@/Components/Footer';
import Header from '@/Components/Header';
import { Head, router } from '@inertiajs/react';
import axios from 'axios';
import { useMemo, useState } from 'react';

export default function MyProjects({ auth, projects: initialProjects = [] }) {
    const [projects, setProjects] = useState(normalizeProjects(initialProjects));
    const [search, setSearch] = useState('');
    const [deletingProjectId, setDeletingProjectId] = useState(null);
    const [message, setMessage] = useState('');

    const filteredProjects = useMemo(() => {
        const normalizedSearch = search.trim().toLowerCase();

        if (!normalizedSearch) {
            return projects;
        }

        return projects.filter((project) => {
            const title = String(project.title || '').toLowerCase();
            const description = String(project.description || '').toLowerCase();

            return (
                title.includes(normalizedSearch) ||
                description.includes(normalizedSearch)
            );
        });
    }, [projects, search]);

    function handleBack() {
        router.visit(route('dashboard'));
    }

    function handleView(project) {
        router.visit(route('project-results.show', project.id));
    }

    function handleEdit(project) {
        router.visit(route('projects.me.edit', project.id));
    }

    async function handleDelete(project) {
        const confirmed = window.confirm(
            `Deseja excluir o projeto "${project.title}"?`
        );

        if (!confirmed) {
            return;
        }

        try {
            setDeletingProjectId(project.id);
            setMessage('');

            await axios.delete(`/projects/me/${project.id}`);

            setProjects((currentProjects) =>
                currentProjects.filter(
                    (currentProject) => currentProject.id !== project.id
                )
            );

            setMessage('Projeto excluído com sucesso.');
        } catch (error) {
            setMessage(
                error?.response?.data?.message ||
                    'Não foi possível excluir o projeto.'
            );
        } finally {
            setDeletingProjectId(null);
        }
    }

    return (
        <>
            <Head title="Meus Projetos" />

            <main className="min-h-screen bg-white font-montserrat text-[#2b211b]">
                <Header auth={auth} activePage="meus-projetos" />

                <section className="mx-auto min-h-[calc(100vh-12.5rem)] max-w-[78rem] px-10 py-8">
                    <button
                        type="button"
                        onClick={handleBack}
                        className="mb-8 text-4xl font-light text-[#653018] transition hover:-translate-x-1"
                        aria-label="Voltar"
                    >
                        ←
                    </button>

                    <div className="flex items-center gap-6">
                        <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-[#733615]">
                            <img
                                src="/images/folder-outline.png"
                                alt=""
                                className="h-9 w-9 object-contain"
                            />
                        </div>

                        <h1 className="font-inter text-[2.2rem] font-black text-[#653018]">
                            Meus Projetos
                        </h1>
                    </div>

                    <p className="mt-6 max-w-[58rem] text-lg leading-relaxed text-[#777777]">
                        Gerencie seus projetos criados, visualize suas
                        informações e retome a edição sempre que necessário.
                    </p>

                    {message && (
                        <div className="mt-6 rounded-xl bg-[#fff3cd] px-5 py-4 text-sm font-semibold text-[#7a4b00]">
                            {message}
                        </div>
                    )}

                    <div className="mt-6 flex justify-end">
                        <label className="relative block w-full max-w-[16rem]">
                            <img
                                src="/images/search-outline.png"
                                alt=""
                                className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 object-contain"
                            />

                            <input
                                type="text"
                                value={search}
                                placeholder="Pesquisar projeto..."
                                onChange={(event) =>
                                    setSearch(event.target.value)
                                }
                                className="h-10 w-full rounded-md border border-[#e5d7c8] bg-[#fffaf4] pl-10 pr-4 text-sm text-[#653018] shadow-sm outline-none transition placeholder:text-[#a8a8a8] focus:ring-2 focus:ring-[#733615]"
                            />
                        </label>
                    </div>

                    <section className="mt-5 overflow-hidden rounded-xl bg-white shadow-md">
                        <div className="grid grid-cols-[1.2fr_1.6fr_1fr_1fr_10rem] bg-[#eadccb] px-8 py-4 text-center font-inter text-lg font-black text-[#653018]">
                            <div>Nome do projeto</div>
                            <div>Descrição</div>
                            <div>Data de criação</div>
                            <div>Última edição</div>
                            <div>Ações</div>
                        </div>

                        {filteredProjects.length === 0 ? (
                            <div className="flex min-h-[10rem] items-center justify-center px-8 py-12 text-center text-base text-[#333333]">
                                {search.trim()
                                    ? 'Nenhum projeto encontrado para a pesquisa.'
                                    : 'Você ainda não possui projetos cadastrados.'}
                            </div>
                        ) : (
                            <div>
                                {filteredProjects.map((project) => (
                                    <div
                                        key={project.id}
                                        className="grid grid-cols-[1.2fr_1.6fr_1fr_1fr_10rem] items-center border-t border-[#d6bfa8] px-8 py-5 text-center"
                                    >
                                        <div className="font-montserrat text-base font-bold text-[#111111]">
                                            {project.title || 'Sem título'}
                                        </div>

                                        <div className="px-4 text-sm leading-relaxed text-[#333333]">
                                            {truncateText(
                                                project.description ||
                                                    'Sem descrição',
                                                80
                                            )}
                                        </div>

                                        <div className="text-sm leading-relaxed text-[#333333]">
                                            {formatDate(project.created_at)}
                                        </div>

                                        <div className="text-sm leading-relaxed text-[#333333]">
                                            {formatDate(project.updated_at)}
                                        </div>

                                        <div className="flex items-center justify-center gap-2">
                                            <ActionButton
                                                icon="/images/eye-empty.png"
                                                label="Visualizar"
                                                onClick={() =>
                                                    handleView(project)
                                                }
                                            />

                                            <ActionButton
                                                icon="/images/pencil.png"
                                                label="Editar"
                                                onClick={() =>
                                                    handleEdit(project)
                                                }
                                            />

                                            <ActionButton
                                                icon="/images/trash-outline.png"
                                                label={
                                                    deletingProjectId ===
                                                    project.id
                                                        ? 'Excluindo'
                                                        : 'Excluir'
                                                }
                                                disabled={
                                                    deletingProjectId ===
                                                    project.id
                                                }
                                                onClick={() =>
                                                    handleDelete(project)
                                                }
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>
                </section>

                <Footer />
            </main>
        </>
    );
}

function ActionButton({ icon, label, onClick, disabled = false }) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            title={label}
            aria-label={label}
            className="flex h-8 w-8 items-center justify-center rounded-md bg-[#a77b5f] transition hover:bg-[#8d6349] disabled:cursor-not-allowed disabled:opacity-50"
        >
            <img src={icon} alt="" className="h-5 w-5 object-contain" />
        </button>
    );
}

function normalizeProjects(projects) {
    if (Array.isArray(projects)) {
        return projects;
    }

    if (Array.isArray(projects?.data)) {
        return projects.data;
    }

    if (Array.isArray(projects?.projects)) {
        return projects.projects;
    }

    if (Array.isArray(projects?.data?.projects)) {
        return projects.data.projects;
    }

    return [];
}

function formatDate(value) {
    if (!value) {
        return '-';
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return '-';
    }

    return new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    }).format(date);
}

function truncateText(text, limit) {
    if (!text) {
        return '';
    }

    if (text.length <= limit) {
        return text;
    }

    return `${text.slice(0, limit).trim()}...`;
}