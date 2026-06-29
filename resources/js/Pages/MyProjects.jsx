import Footer from '@/Components/Footer';
import Header from '@/Components/Header';
import { Head, router } from '@inertiajs/react';
import axios from 'axios';
import { useMemo, useState } from 'react';

export default function MyProjects({ auth, projects: initialProjects = [] }) {
    const [projects, setProjects] = useState(normalizeProjects(initialProjects));
    const [search, setSearch] = useState('');
    const [deletingProjectId, setDeletingProjectId] = useState(null);
    const [projectToDelete, setProjectToDelete] = useState(null);
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

    function openDeleteProjectModal(project) {
        setProjectToDelete(project);
        setMessage('');
    }

    function closeDeleteProjectModal() {
        if (deletingProjectId) {
            return;
        }

        setProjectToDelete(null);
    }

    async function confirmDeleteProject() {
        if (!projectToDelete) {
            return;
        }

        try {
            setDeletingProjectId(projectToDelete.id);
            setMessage('');

            await axios.delete(`/projects/me/${projectToDelete.id}`);

            setProjects((currentProjects) =>
                currentProjects.filter(
                    (currentProject) => currentProject.id !== projectToDelete.id
                )
            );

            setProjectToDelete(null);
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
                                                label="Excluir"
                                                disabled={
                                                    deletingProjectId ===
                                                    project.id
                                                }
                                                onClick={() =>
                                                    openDeleteProjectModal(
                                                        project
                                                    )
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

                {projectToDelete && (
                    <DeleteProjectModal
                        processing={deletingProjectId === projectToDelete.id}
                        onClose={closeDeleteProjectModal}
                        onConfirm={confirmDeleteProject}
                    />
                )}
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

function DeleteProjectModal({ processing, onClose, onConfirm }) {
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/20 px-4 backdrop-blur-[1px]">
            <div className="relative w-full max-w-[21rem] rounded-2xl bg-white px-6 py-6 shadow-2xl">
                <button
                    type="button"
                    onClick={onClose}
                    disabled={processing}
                    className="absolute right-5 top-4 text-2xl font-light text-[#333333] transition hover:text-[#653018] disabled:cursor-not-allowed"
                    aria-label="Fechar"
                >
                    ×
                </button>

                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-50">
                    <TrashIcon className="h-6 w-6 text-red-600" />
                </div>

                <h2 className="mt-5 font-inter text-lg font-black text-[#202532]">
                    Deseja deletar o seu projeto?
                </h2>

                <p className="mt-2 text-sm leading-relaxed text-[#6b7280]">
                    Depois que seu projeto for excluído, todos os dados e
                    informações dele serão excluídos permanentemente.
                </p>

                <div className="mt-6 space-y-3">
                    <button
                        type="button"
                        onClick={onConfirm}
                        disabled={processing}
                        className="h-11 w-full rounded-md bg-red-600 font-inter text-sm font-black text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {processing ? 'Excluindo...' : 'Excluir'}
                    </button>

                    <button
                        type="button"
                        onClick={onClose}
                        disabled={processing}
                        className="h-11 w-full rounded-md border border-[#d6d6d6] bg-white font-inter text-sm font-black text-[#4b5563] transition hover:bg-gray-50 disabled:cursor-not-allowed"
                    >
                        Cancelar
                    </button>
                </div>
            </div>
        </div>
    );
}

function TrashIcon({ className = '' }) {
    return (
        <svg
            className={className}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M3 6h18" />
            <path d="M8 6V4h8v2" />
            <path d="M19 6l-1 14H6L5 6" />
            <path d="M10 11v6" />
            <path d="M14 11v6" />
        </svg>
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