import Footer from '@/Components/Footer';
import Header from '@/Components/Header';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import { useRef, useState } from 'react';

export default function Edit({ auth }) {
    const pageAuth = usePage().props?.auth;
    const user = pageAuth?.user ?? auth?.user ?? {
        name: '',
        email: '',
    };

    const [successModal, setSuccessModal] = useState(false);
    const [deleteAccountModal, setDeleteAccountModal] = useState(false);

    const profileForm = useForm({
        name: user.name || '',
        email: user.email || '',
    });

    const passwordInput = useRef(null);
    const currentPasswordInput = useRef(null);

    const passwordForm = useForm({
        current_password: '',
        password: '',
        password_confirmation: '',
    });

    const deleteForm = useForm({
        password: '',
    });

    function handleBack() {
        router.visit(route('dashboard'));
    }

    function updateProfile(event) {
        event.preventDefault();

        profileForm.patch(route('profile.update'), {
            preserveScroll: true,
            onSuccess: () => setSuccessModal(true),
        });
    }

    function updatePassword(event) {
        event.preventDefault();

        passwordForm.put(route('password.update'), {
            preserveScroll: true,
            onSuccess: () => {
                passwordForm.reset();
                setSuccessModal(true);
            },
            onError: (errors) => {
                if (errors.password) {
                    passwordForm.reset('password', 'password_confirmation');
                    passwordInput.current?.focus();
                }

                if (errors.current_password) {
                    passwordForm.reset('current_password');
                    currentPasswordInput.current?.focus();
                }
            },
        });
    }

    function confirmDeleteAccount(event) {
        event.preventDefault();

        deleteForm.delete(route('profile.destroy'), {
            preserveScroll: true,
            onSuccess: () => closeDeleteAccountModal(),
            onError: () => {
                document.getElementById('delete-account-password')?.focus();
            },
            onFinish: () => deleteForm.reset(),
        });
    }

    function openDeleteAccountModal() {
        deleteForm.clearErrors();
        deleteForm.reset();
        setDeleteAccountModal(true);
    }

    function closeDeleteAccountModal() {
        deleteForm.clearErrors();
        deleteForm.reset();
        setDeleteAccountModal(false);
    }

    return (
        <>
            <Head title="Meu perfil" />

            <main className="min-h-screen bg-white font-montserrat text-[#2b211b]">
                <Header auth={{ user }} activePage="" />

                <section className="mx-auto min-h-[calc(100vh-12.5rem)] max-w-[78rem] px-10 py-8">
                    <button
                        type="button"
                        onClick={handleBack}
                        className="mb-8 text-4xl font-light text-[#653018] transition hover:-translate-x-1"
                        aria-label="Voltar"
                    >
                        ←
                    </button>

                    <div className="flex items-center gap-5">
                        <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-[#733615]">
                            <ProfileIcon className="h-8 w-8 text-white" />
                        </div>

                        <h1 className="font-inter text-[2.2rem] font-black text-[#653018]">
                            Meu perfil
                        </h1>
                    </div>

                    <p className="mt-5 max-w-[44rem] text-base leading-relaxed text-[#777777]">
                        Gerencie suas informações pessoais, altere sua senha e
                        configure opções relacionadas à sua conta.
                    </p>

                    <div className="mt-8 space-y-8">
                        <ProfileCard title="Informações do Perfil">
                            <form onSubmit={updateProfile}>
                                <div className="space-y-5">
                                    <InputField
                                        id="name"
                                        label="Nome*"
                                        value={profileForm.data.name}
                                        onChange={(value) =>
                                            profileForm.setData('name', value)
                                        }
                                        error={profileForm.errors.name}
                                    />

                                    <InputField
                                        id="email"
                                        label="E-mail*"
                                        type="email"
                                        value={profileForm.data.email}
                                        onChange={(value) =>
                                            profileForm.setData('email', value)
                                        }
                                        error={profileForm.errors.email}
                                    />
                                </div>

                                <div className="mt-6 flex justify-end">
                                    <BrownButton
                                        type="submit"
                                        disabled={profileForm.processing}
                                    >
                                        Salvar
                                    </BrownButton>
                                </div>
                            </form>
                        </ProfileCard>

                        <ProfileCard title="Segurança/Alteração de Senha">
                            <form onSubmit={updatePassword}>
                                <div className="space-y-5">
                                    <InputField
                                        id="current_password"
                                        label="Senha atual*"
                                        type="password"
                                        inputRef={currentPasswordInput}
                                        value={
                                            passwordForm.data.current_password
                                        }
                                        onChange={(value) =>
                                            passwordForm.setData(
                                                'current_password',
                                                value
                                            )
                                        }
                                        error={
                                            passwordForm.errors.current_password
                                        }
                                    />

                                    <InputField
                                        id="password"
                                        label="Nova senha*"
                                        type="password"
                                        inputRef={passwordInput}
                                        value={passwordForm.data.password}
                                        onChange={(value) =>
                                            passwordForm.setData(
                                                'password',
                                                value
                                            )
                                        }
                                        error={passwordForm.errors.password}
                                    />

                                    <InputField
                                        id="password_confirmation"
                                        label="Confirmar nova senha*"
                                        type="password"
                                        value={
                                            passwordForm.data
                                                .password_confirmation
                                        }
                                        onChange={(value) =>
                                            passwordForm.setData(
                                                'password_confirmation',
                                                value
                                            )
                                        }
                                        error={
                                            passwordForm.errors
                                                .password_confirmation
                                        }
                                    />
                                </div>

                                <div className="mt-6 flex justify-end">
                                    <BrownButton
                                        type="submit"
                                        disabled={passwordForm.processing}
                                    >
                                        Salvar
                                    </BrownButton>
                                </div>
                            </form>
                        </ProfileCard>

                        <ProfileCard title="Excluir conta">
                            <div className="grid gap-6 md:grid-cols-[1fr_auto] md:items-center">
                                <p className="text-center text-sm leading-relaxed text-[#333333] md:text-left">
                                    A exclusão da conta removerá
                                    permanentemente todos os seus projetos e
                                    dados armazenados.
                                    <br />
                                    <strong>
                                        Esta ação não poderá ser desfeita.
                                    </strong>
                                </p>

                                <button
                                    type="button"
                                    onClick={openDeleteAccountModal}
                                    className="rounded-md bg-red-600 px-8 py-3 font-inter text-sm font-black text-white shadow-sm transition hover:bg-red-700"
                                >
                                    Excluir
                                </button>
                            </div>
                        </ProfileCard>
                    </div>
                </section>

                <Footer />

                {successModal && (
                    <SuccessModal
                        message="Informações atualizadas com sucesso!"
                        onClose={() => setSuccessModal(false)}
                    />
                )}

                {deleteAccountModal && (
                    <DeleteAccountModal
                        password={deleteForm.data.password}
                        onPasswordChange={(value) =>
                            deleteForm.setData('password', value)
                        }
                        error={deleteForm.errors.password}
                        processing={deleteForm.processing}
                        onClose={closeDeleteAccountModal}
                        onConfirm={confirmDeleteAccount}
                    />
                )}
            </main>
        </>
    );
}

function ProfileCard({ title, children }) {
    return (
        <section className="overflow-hidden rounded-xl bg-white shadow-md">
            <div className="bg-[#eadccb] px-6 py-4">
                <h2 className="font-inter text-lg font-black text-[#653018]">
                    {title}
                </h2>
            </div>

            <div className="px-8 py-7">{children}</div>
        </section>
    );
}

function InputField({
    id,
    label,
    value,
    onChange,
    type = 'text',
    error = '',
    inputRef = null,
}) {
    return (
        <label htmlFor={id} className="block">
            <span className="font-montserrat text-sm font-bold text-[#653018]">
                {label}
            </span>

            <input
                id={id}
                ref={inputRef}
                type={type}
                value={value}
                onChange={(event) => onChange(event.target.value)}
                className="mt-2 h-11 w-full border-0 border-b border-[#d6bfa8] bg-transparent px-1 font-montserrat text-[#653018] outline-none transition placeholder:text-[#c7c7c7] focus:border-[#733615] focus:ring-0"
            />

            {error && (
                <p className="mt-2 text-sm font-semibold text-red-600">
                    {error}
                </p>
            )}
        </label>
    );
}

function BrownButton({ children, disabled = false, type = 'button' }) {
    return (
        <button
            type={type}
            disabled={disabled}
            className="rounded-md bg-[#a77b5f] px-8 py-2.5 font-inter text-sm font-black text-white shadow-sm transition hover:bg-[#8d6349] disabled:cursor-not-allowed disabled:opacity-60"
        >
            {children}
        </button>
    );
}

function SuccessModal({ message, onClose }) {
    return (
        <ModalBackdrop>
            <div className="relative w-full max-w-[27rem] rounded-2xl bg-white px-8 py-10 text-center shadow-2xl">
                <button
                    type="button"
                    onClick={onClose}
                    className="absolute right-5 top-4 text-3xl font-light text-[#333333] transition hover:text-[#653018]"
                    aria-label="Fechar"
                >
                    ×
                </button>

                <div className="mx-auto flex h-28 w-28 items-center justify-center rounded-full bg-[#f4ebe3]">
                    <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#eadccb]">
                        <CheckIcon className="h-11 w-11 text-[#653018]" />
                    </div>
                </div>

                <p className="mt-8 font-inter text-[1.65rem] font-semibold leading-tight text-[#222222]">
                    {message}
                </p>
            </div>
        </ModalBackdrop>
    );
}

function DeleteAccountModal({
    password,
    onPasswordChange,
    error,
    processing,
    onClose,
    onConfirm,
}) {
    return (
        <ModalBackdrop>
            <form
                onSubmit={onConfirm}
                className="relative w-full max-w-[29rem] rounded-2xl bg-white px-8 py-8 shadow-2xl"
            >
                <button
                    type="button"
                    onClick={onClose}
                    className="absolute right-5 top-4 text-3xl font-light text-[#333333] transition hover:text-[#653018]"
                    aria-label="Fechar"
                >
                    ×
                </button>

                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-50">
                    <TrashIcon className="h-7 w-7 text-red-600" />
                </div>

                <h2 className="mt-6 font-inter text-2xl font-black text-[#202532]">
                    Deseja deletar a sua conta?
                </h2>

                <p className="mt-3 text-base leading-relaxed text-[#6b7280]">
                    Depois que sua conta for excluída, todos os seus projetos
                    serão excluídos permanentemente.
                </p>

                <label
                    htmlFor="delete-account-password"
                    className="mt-5 block"
                >
                    <span className="font-montserrat text-sm font-bold text-[#653018]">
                        Senha atual*
                    </span>

                    <input
                        id="delete-account-password"
                        type="password"
                        value={password}
                        onChange={(event) =>
                            onPasswordChange(event.target.value)
                        }
                        className="mt-2 h-11 w-full rounded-lg border border-[#d6bfa8] bg-[#fffaf4] px-4 font-montserrat text-[#653018] outline-none focus:ring-2 focus:ring-[#733615]"
                    />

                    {error && (
                        <p className="mt-2 text-sm font-semibold text-red-600">
                            {error}
                        </p>
                    )}
                </label>

                <div className="mt-7 space-y-4">
                    <button
                        type="submit"
                        disabled={processing}
                        className="h-12 w-full rounded-lg bg-red-600 font-inter text-base font-black text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        Excluir
                    </button>

                    <button
                        type="button"
                        onClick={onClose}
                        className="h-12 w-full rounded-lg border border-[#d6d6d6] bg-white font-inter text-base font-black text-[#4b5563] transition hover:bg-gray-50"
                    >
                        Cancelar
                    </button>
                </div>
            </form>
        </ModalBackdrop>
    );
}

function ModalBackdrop({ children }) {
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/20 px-4 backdrop-blur-[1px]">
            {children}
        </div>
    );
}

function ProfileIcon({ className = '' }) {
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
            <path d="M20 21a8 8 0 0 0-16 0" />
            <circle cx="12" cy="7" r="4" />
        </svg>
    );
}

function CheckIcon({ className = '' }) {
    return (
        <svg
            className={className}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M20 6L9 17l-5-5" />
        </svg>
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