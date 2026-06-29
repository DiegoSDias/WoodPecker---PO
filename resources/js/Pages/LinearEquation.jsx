import Footer from '@/Components/Footer';
import Header from '@/Components/Header';
import { Head, router } from '@inertiajs/react';
import { useState } from 'react';

export default function LinearSystems({ auth }) {
    const isLoggedIn = Boolean(auth?.user);

    const [variables, setVariables] = useState(3);
    const [matrixA, setMatrixA] = useState(createMatrix(3));
    const [vectorB, setVectorB] = useState(createVector(3));
    const [result, setResult] = useState(null);
    const [message, setMessage] = useState('');
    const [isCalculating, setIsCalculating] = useState(false);

    function updateVariables(newSize) {
        if (newSize < 2 || newSize > 5) return;

        setVariables(newSize);
        setMatrixA((currentMatrix) => resizeMatrix(currentMatrix, newSize));
        setVectorB((currentVector) => resizeVector(currentVector, newSize));
        setResult(null);
        setMessage('');
    }

    function handleMatrixChange(rowIndex, colIndex, value) {
        setMatrixA((currentMatrix) =>
            currentMatrix.map((row, currentRowIndex) =>
                row.map((cell, currentColIndex) =>
                    currentRowIndex === rowIndex &&
                    currentColIndex === colIndex
                        ? value
                        : cell
                )
            )
        );

        setResult(null);
        setMessage('');
    }

    function handleVectorChange(index, value) {
        setVectorB((currentVector) =>
            currentVector.map((cell, currentIndex) =>
                currentIndex === index ? value : cell
            )
        );

        setResult(null);
        setMessage('');
    }

    function clearFields() {
        setMatrixA(createMatrix(variables));
        setVectorB(createVector(variables));
        setResult(null);
        setMessage('');
    }

    async function calculateSolution() {
        setIsCalculating(true);
        setResult(null);
        setMessage('');

        try {
            const payload = {
                matrix_a: matrixA.map((row) =>
                    row.map((value) => parseInputNumber(value))
                ),
                vector_b: vectorB.map((value) => parseInputNumber(value)),
            };

            const response = await window.axios.post(
                '/linear-systems/solve',
                payload
            );

            const backendResult = response.data?.data;

            setResult(backendResult);
            setMessage(
                response.data?.message || 'Sistema linear resolvido com sucesso.'
            );
        } catch (error) {
            setMessage(getErrorMessage(error));
        } finally {
            setIsCalculating(false);
        }
    }

    return (
        <>
            <Head title="Sistemas Lineares" />

            <main className="min-h-screen bg-white font-montserrat text-[#2b211b]">
                <Header auth={auth} activePage="novo-problema" />

                <section className="bg-white px-10 py-8">
                    <div className="mx-auto max-w-[78rem]">
                        <button
                            type="button"
                            onClick={() => router.visit('/')}
                            className="mb-8 text-4xl font-light text-[#653018] transition hover:-translate-x-1"
                            aria-label="Voltar"
                        >
                            ←
                        </button>

                        <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
                            <div className="flex items-center gap-6">
                                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-[#733615]">
                                    <img
                                        src="/images/(x).png"
                                        alt=""
                                        className="h-9 w-9 object-contain"
                                    />
                                </div>

                                <h1 className="font-inter text-[2.2rem] font-black text-[#653018]">
                                    Sistemas Lineares
                                </h1>
                            </div>

                            <div className="flex items-center gap-5 rounded-xl border border-[#733615] px-5 py-2 font-montserrat text-xl text-[#653018]">
                                <span>Número de variáveis:</span>

                                <button
                                    type="button"
                                    onClick={() =>
                                        updateVariables(variables - 1)
                                    }
                                    className="font-bold transition hover:scale-110"
                                    aria-label="Diminuir número de variáveis"
                                >
                                    −
                                </button>

                                <span className="font-bold">{variables}</span>

                                <button
                                    type="button"
                                    onClick={() =>
                                        updateVariables(variables + 1)
                                    }
                                    className="font-bold transition hover:scale-110"
                                    aria-label="Aumentar número de variáveis"
                                >
                                    +
                                </button>
                            </div>
                        </div>

                        <p className="mt-6 max-w-[60rem] font-montserrat text-lg leading-relaxed text-[#777777]">
                            Preencha os coeficientes da matriz A e os termos do
                            vetor b para calcular automaticamente a solução do
                            sistema.
                        </p>

                        {message && (
                            <div className="mt-6 rounded-lg bg-[#fff3cd] px-5 py-4 text-sm font-semibold text-[#7a4b00]">
                                {message}
                            </div>
                        )}

                        <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-[1fr_15rem]">
                            <div className="overflow-hidden rounded-xl bg-white shadow-md">
                                <div className="grid grid-cols-[1fr_10rem_12rem] bg-[#eadccb] px-6 py-4 text-center font-inter text-lg font-black text-[#653018]">
                                    <div>Matriz A (Coeficientes)</div>
                                    <div>Variáveis</div>
                                    <div>Vetor b</div>
                                </div>

                                <div className="grid grid-cols-[1fr_10rem_12rem] items-center gap-8 px-6 py-7">
                                    <div className="rounded-xl bg-[#eadccb] p-5 shadow-inner">
                                        <div
                                            className="grid gap-5"
                                            style={{
                                                gridTemplateColumns: `repeat(${variables}, minmax(0, 1fr))`,
                                            }}
                                        >
                                            {matrixA.map((row, rowIndex) =>
                                                row.map((cell, colIndex) => (
                                                    <input
                                                        key={`${rowIndex}-${colIndex}`}
                                                        type="number"
                                                        step="any"
                                                        value={cell}
                                                        placeholder="0"
                                                        onChange={(event) =>
                                                            handleMatrixChange(
                                                                rowIndex,
                                                                colIndex,
                                                                event.target
                                                                    .value
                                                            )
                                                        }
                                                        className="h-12 rounded-xl bg-[#fffaf4] text-center font-montserrat text-lg text-[#653018] shadow outline-none transition placeholder:text-[#a8a8a8] focus:ring-2 focus:ring-[#733615]"
                                                    />
                                                ))
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex flex-col items-center gap-6">
                                        {Array.from({
                                            length: variables,
                                        }).map((_, index) => {
                                            const middleRow = Math.floor(
                                                variables / 2
                                            );

                                            return (
                                                <div
                                                    key={index}
                                                    className="grid w-full grid-cols-[1.5rem_1fr_1.5rem] items-center justify-center gap-3"
                                                >
                                                    <span className="text-center text-2xl text-[#1d1d1d]">
                                                        {index === middleRow
                                                            ? '×'
                                                            : ''}
                                                    </span>

                                                    <span className="rounded-xl bg-[#fffaf4] px-4 py-3 text-center font-montserrat text-lg font-bold text-[#999999] shadow">
                                                        x{index + 1}
                                                    </span>

                                                    <span className="text-center text-2xl text-[#1d1d1d]">
                                                        {index === middleRow
                                                            ? '='
                                                            : ''}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    <div className="rounded-xl bg-[#eadccb] p-5 shadow-inner">
                                        <div className="flex flex-col gap-5">
                                            {vectorB.map((cell, index) => (
                                                <input
                                                    key={index}
                                                    type="number"
                                                    step="any"
                                                    value={cell}
                                                    placeholder={`b${
                                                        index + 1
                                                    }`}
                                                    onChange={(event) =>
                                                        handleVectorChange(
                                                            index,
                                                            event.target.value
                                                        )
                                                    }
                                                    className="h-12 rounded-xl bg-[#fffaf4] text-center font-montserrat text-lg text-[#653018] shadow outline-none transition placeholder:text-[#a8a8a8] focus:ring-2 focus:ring-[#733615]"
                                                />
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex justify-end px-10 pb-7">
                                    <button
                                        type="button"
                                        onClick={clearFields}
                                        className="flex items-center gap-2 font-montserrat text-sm font-medium text-red-600 transition hover:text-red-700"
                                    >
                                        <img
                                            src="/images/bin-half.png"
                                            alt=""
                                            className="h-5 w-5 object-contain"
                                        />
                                        Limpar tudo
                                    </button>
                                </div>
                            </div>

                            <ResultCard result={result} variables={variables} />
                        </div>

                        <div className="mt-6 flex flex-col items-center gap-4 lg:flex-row lg:justify-end lg:pr-[17rem]">
                            <button
                                type="button"
                                onClick={calculateSolution}
                                disabled={isCalculating}
                                className="flex items-center gap-3 rounded-xl bg-[#a77b5f] px-8 py-3 font-inter text-xl font-black text-white shadow-md transition hover:bg-[#8d6349] disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                <img
                                    src="/images/calculator.png"
                                    alt=""
                                    className="h-6 w-6 object-contain"
                                />
                                {isCalculating
                                    ? 'Calculando...'
                                    : result?.type === 'unique'
                                      ? 'Calcular resultado'
                                      : 'Calcular solução'}
                            </button>
                        </div>
                    </div>
                </section>

                <Footer />
            </main>
        </>
    );
}

function ResultCard({ result, variables }) {
    return (
        <div className="overflow-hidden rounded-xl bg-white shadow-md">
            <div className="bg-[#eadccb] px-6 py-4 text-center font-inter text-lg font-black text-[#653018]">
                Resultado
            </div>

            <div className="flex min-h-[25rem] flex-col justify-center px-7 py-8">
                {!result && (
                    <div className="space-y-12">
                        {Array.from({ length: variables }).map((_, index) => (
                            <div
                                key={index}
                                className="flex items-center justify-center gap-4 font-montserrat text-2xl font-bold text-[#653018]"
                            >
                                <span className="rounded-xl bg-[#a77b5f] px-5 py-3 text-white">
                                    x{index + 1}
                                </span>
                                <span>=</span>
                            </div>
                        ))}
                    </div>
                )}

                {result?.type === 'unique' && (
                    <div className="space-y-10">
                        {Object.entries(result.solution || {}).map(
                            ([variable, value]) => (
                                <div
                                    key={variable}
                                    className="flex items-center justify-center gap-4 font-montserrat text-xl font-bold text-[#653018]"
                                >
                                    <span className="rounded-xl bg-[#a77b5f] px-5 py-3 text-white">
                                        {variable}
                                    </span>
                                    <span>=</span>
                                    <span>{formatNumber(value)}</span>
                                </div>
                            )
                        )}
                    </div>
                )}

                {result?.type === 'inconsistent' && (
                    <p className="text-center font-montserrat text-base font-semibold leading-relaxed text-[#777777]">
                        Sistema impossível.
                        <br />
                        Não existe solução.
                    </p>
                )}

                {result?.type === 'infinite' && (
                    <p className="text-center font-montserrat text-base font-semibold leading-relaxed text-[#777777]">
                        Sistema possível e indeterminado.
                        <br />
                        Infinitas soluções.
                    </p>
                )}
            </div>
        </div>
    );
}

function createMatrix(size) {
    return Array.from({ length: size }, () => Array(size).fill(''));
}

function createVector(size) {
    return Array(size).fill('');
}

function resizeMatrix(currentMatrix, newSize) {
    return Array.from({ length: newSize }, (_, rowIndex) =>
        Array.from(
            { length: newSize },
            (_, colIndex) => currentMatrix[rowIndex]?.[colIndex] ?? ''
        )
    );
}

function resizeVector(currentVector, newSize) {
    return Array.from(
        { length: newSize },
        (_, index) => currentVector[index] ?? ''
    );
}

function parseInputNumber(value) {
    if (value === '' || value === null || value === undefined) {
        return 0;
    }

    const normalizedValue = String(value).replace(',', '.');
    const number = Number(normalizedValue);

    return Number.isNaN(number) ? 0 : number;
}

function formatNumber(value) {
    const number = Number(value);

    if (Number.isNaN(number)) {
        return value;
    }

    const roundedValue = Number(number.toFixed(4));

    if (Object.is(roundedValue, -0)) {
        return '0';
    }

    return roundedValue.toString();
}

function getErrorMessage(error) {
    const validationErrors = error.response?.data?.errors;

    if (validationErrors) {
        const firstError = Object.values(validationErrors)[0];

        if (Array.isArray(firstError)) {
            return firstError[0];
        }

        return String(firstError);
    }

    return (
        error.response?.data?.message ||
        error.response?.data?.error?.detalhe ||
        'Não foi possível resolver a equação linear.'
    );
}