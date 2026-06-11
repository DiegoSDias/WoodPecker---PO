export default function Footer() {
    return (
        <footer
            className="h-[5rem] bg-cover bg-center bg-no-repeat"
            style={{
                backgroundImage: "url('/images/wood-background.png')",
            }}
        >
            <div className="mx-auto flex h-full max-w-[78rem] items-center justify-between px-10 text-white">
                <p className="font-montserrat text-sm font-semibold">
                    Woodpecker
                </p>

                <div className="flex items-center gap-3 font-montserrat text-sm">
                    <img
                        src="/images/copyright.png"
                        alt="Copyright"
                        className="h-6 w-6 object-contain"
                    />

                    <span>
                        2026 Woodpecker. Desenvolvido para Pesquisa Operacional.
                    </span>
                </div>

                <div className="flex items-center gap-5">
                    <a
                        href="https://github.com/DiegoSDias/WoodPecker---PO"
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label="GitHub do projeto"
                    >
                        <img
                            src="/images/github.png"
                            alt="GitHub"
                            className="h-8 w-8 object-contain transition hover:scale-110"
                        />
                    </a>

                    <a
                        href="#"
                        aria-label="Documentação do projeto"
                    >
                        <img
                            src="/images/document-text-outline.png"
                            alt="Documentação"
                            className="h-8 w-8 object-contain transition hover:scale-110"
                        />
                    </a>
                </div>
            </div>
        </footer>
    );
}
