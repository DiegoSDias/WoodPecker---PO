import { Link, router, usePage } from '@inertiajs/react';
import { useState } from 'react';

export default function Header({ auth, activePage = 'inicio' }) {
    const pageAuth = usePage().props?.auth;
    const user = pageAuth?.user ?? auth?.user ?? null;
    const isLoggedIn = Boolean(user);

    const [accessModal, setAccessModal] = useState({
        isOpen: false,
        routeName: null,
        type: null,
    });

    function goToHome() {
        router.visit(route('dashboard'));
    }

    function goToLinearSystems() {
        if (isLoggedIn) {
            router.visit(route('linear-systems'));
            return;
        }

        setAccessModal({
            isOpen: true,
            routeName: 'linear-systems',
            type: 'linear',
        });
    }

    function goToSimplex() {
        if (isLoggedIn) {
            router.visit(route('mathematical-modeling'));
            return;
        }

        setAccessModal({
            isOpen: true,
            routeName: 'mathematical-modeling',
            type: 'simplex',
        });
    }

    function goToProjects() {
        router.visit(isLoggedIn ? route('projects.me.index') : route('login'));
    }

    function closeAccessModal() {
        setAccessModal({
            isOpen: false,
            routeName: null,
            type: null,
        });
    }

    function goToLogin() {
        closeAccessModal();
        router.visit(route('login'));
    }

    function continueWithoutLogin() {
        if (!accessModal.routeName) {
            closeAccessModal();
            return;
        }

        const routeName = accessModal.routeName;

        closeAccessModal();
        router.visit(route(routeName));
    }

    return (
        <>
            <header
                className="sticky top-0 z-50 h-[7.5rem] bg-cover bg-center bg-no-repeat"
                style={{
                    backgroundImage: "url('/images/wood-background.png')",
                }}
            >
                <div className="mx-auto flex h-full max-w-[78rem] items-center justify-between px-10">
                    <button
                        type="button"
                        onClick={goToHome}
                        className="flex items-center"
                        aria-label="Ir para o início"
                    >
                        <img
                            src="/images/logo-woodpecker-horizontal.png"
                            alt="Woodpecker"
                            className="w-[14rem] object-contain"
                        />
                    </button>

                    <nav className="flex items-center gap-2 rounded-full bg-white px-5 py-3 shadow-md">
                        <HeaderButton
                            label="Início"
                            active={activePage === 'inicio'}
                            onClick={goToHome}
                        />

                        <HeaderButton
                            label="Linear"
                            active={activePage === 'linear'}
                            onClick={goToLinearSystems}
                        />

                        <HeaderButton
                            label="Simplex"
                            active={activePage === 'simplex'}
                            onClick={goToSimplex}
                        />

                        <HeaderButton
                            label="Meus projetos"
                            active={activePage === 'meus-projetos'}
                            onClick={goToProjects}
                        />
                    </nav>

                    <div className="flex items-center gap-3">
                        <Link
                            href={
                                isLoggedIn
                                    ? route('profile.edit')
                                    : route('login')
                            }
                            aria-label={
                                isLoggedIn
                                    ? 'Abrir perfil'
                                    : 'Entrar na conta'
                            }
                            className="transition hover:scale-105"
                        >
                            <img
                                src="/images/person-circle.png"
                                alt=""
                                className="h-12 w-12 object-contain"
                            />
                        </Link>

                        {isLoggedIn && (
                            <Link
                                href={route('logout')}
                                method="post"
                                as="button"
                                className="rounded-full bg-white px-5 py-2 font-montserrat text-sm font-bold text-[#653018] shadow-md transition hover:bg-[#f4ebe3]"
                            >
                                Sair
                            </Link>
                        )}
                    </div>
                </div>
            </header>

            {accessModal.isOpen && (
                <AccessChoiceModal
                    type={accessModal.type}
                    onClose={closeAccessModal}
                    onLogin={goToLogin}
                    onContinue={continueWithoutLogin}
                />
            )}
        </>
    );
}

function HeaderButton({ label, active, onClick }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`rounded-full px-7 py-2 font-montserrat text-base font-medium transition ${
                active
                    ? 'bg-[#eadccb] text-[#653018]'
                    : 'text-[#653018] hover:bg-[#f4ebe3]'
            }`}
        >
            {label}
        </button>
    );
}

function AccessChoiceModal({ type, onClose, onLogin, onContinue }) {
    const isSimplex = type === 'simplex';

    return (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/50 px-4">
            <div className="w-full max-w-[32rem] rounded-2xl bg-white p-8 shadow-2xl">
                <div className="flex justify-end">
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-2xl font-bold text-gray-500 transition hover:text-[#653018]"
                        aria-label="Fechar modal"
                    >
                        ×
                    </button>
                </div>

                <h2 className="text-center font-inter text-[2rem] font-black text-[#653018]">
                    Como deseja continuar?
                </h2>

                <p className="mt-4 text-center text-base leading-relaxed text-gray-600">
                    {isSimplex
                        ? 'Você pode entrar na sua conta para salvar o projeto ou continuar sem login apenas para testar e resolver o problema.'
                        : 'Você pode entrar na sua conta ou continuar sem login para testar e resolver o problema.'}
                </p>

                <div className="mt-8 space-y-4">
                    <button
                        type="button"
                        onClick={onLogin}
                        className="w-full rounded-lg bg-[#733615] px-5 py-3 text-lg font-bold text-white transition hover:bg-[#5b2a10]"
                    >
                        Entrar na minha conta
                    </button>

                    <button
                        type="button"
                        onClick={onContinue}
                        className="w-full rounded-lg bg-[#eadccb] px-5 py-3 text-lg font-bold text-[#653018] transition hover:bg-[#dfcbb6]"
                    >
                        Continuar sem login
                    </button>
                </div>
            </div>
        </div>
    );
}