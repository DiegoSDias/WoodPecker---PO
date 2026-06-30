import Footer from '@/Components/Footer';
import Header from '@/Components/Header';
import { Head, router, usePage } from '@inertiajs/react';
import { useEffect, useState } from 'react';

export default function LinearIntegerProgramming({ auth, project = null }) {
    const pageAuth = usePage().props?.auth;
    const user = pageAuth?.user ?? auth?.user ?? null;
    const isLoggedIn = Boolean(user);

    const initialState = buildInitialProjectState(project);

    const [title, setTitle] = useState(initialState.title);
    const [description, setDescription] = useState(initialState.description);
    const [optimizationType, setOptimizationType] = useState(
        initialState.optimizationType
    );
    const [numVariables, setNumVariables] = useState(initialState.numVariables);
    const [objectiveCoefficients, setObjectiveCoefficients] = useState(
        initialState.objectiveCoefficients
    );
    const [constraints, setConstraints] = useState(initialState.constraints);
    const [projectId, setProjectId] = useState(initialState.projectId);
    const [isProcessing, setIsProcessing] = useState(false);
    const [message, setMessage] = useState('');

    useEffect(() => {
        const nextState = buildInitialProjectState(project);

        setTitle(nextState.title);
        setDescription(nextState.description);
        setOptimizationType(nextState.optimizationType);
        setNumVariables(nextState.numVariables);
        setObjectiveCoefficients(nextState.objectiveCoefficients);
        setConstraints(nextState.constraints);
        setProjectId(nextState.projectId);
        setMessage('');
    }, [project]);

    function clearFeedback() {
        setMessage('');
    }

    function updateTitle(value) {
        setTitle(value);
        clearFeedback();
    }

    function updateDescription(value) {
        setDescription(value.slice(0, 100));
        clearFeedback();
    }

    function updateOptimizationType(value) {
        setOptimizationType(value);
        clearFeedback();
    }

    function addVariable() {
        if (numVariables >= 6) {
            return;
        }

        const nextCount = numVariables + 1;

        setNumVariables(nextCount);

        setObjectiveCoefficients((current) =>
            resizeCoefficients(current, nextCount)
        );

        setConstraints((current) =>
            current.map((constraint) => ({
                ...constraint,
                coefficients: resizeCoefficients(
                    constraint.coefficients,
                    nextCount
                ),
            }))
        );

        clearFeedback();
    }

    function removeVariable(variableIndex) {
        if (numVariables <= 2) {
            return;
        }

        const nextCount = numVariables - 1;

        setNumVariables(nextCount);

        setObjectiveCoefficients((current) =>
            current.filter((_, index) => index !== variableIndex)
        );

        setConstraints((current) =>
            current.map((constraint) => ({
                ...constraint,
                coefficients: constraint.coefficients.filter(
                    (_, index) => index !== variableIndex
                ),
            }))
        );

        clearFeedback();
    }

    function updateObjectiveCoefficient(index, value) {
        setObjectiveCoefficients((current) =>
            current.map((coefficient, currentIndex) =>
                currentIndex === index ? value : coefficient
            )
        );

        clearFeedback();
    }

    function updateConstraintCoefficient(
        constraintIndex,
        coefficientIndex,
        value
    ) {
        setConstraints((current) =>
            current.map((constraint, currentConstraintIndex) => {
                if (currentConstraintIndex !== constraintIndex) {
                    return constraint;
                }

                return {
                    ...constraint,
                    coefficients: constraint.coefficients.map(
                        (coefficient, currentCoefficientIndex) =>
                            currentCoefficientIndex === coefficientIndex
                                ? value
                                : coefficient
                    ),
                };
            })
        );

        clearFeedback();
    }

    function updateConstraintField(constraintIndex, field, value) {
        setConstraints((current) =>
            current.map((constraint, currentIndex) =>
                currentIndex === constraintIndex
                    ? { ...constraint, [field]: value }
                    : constraint
            )
        );

        clearFeedback();
    }

    function addConstraint() {
        setConstraints((current) => [
            ...current,
            createEmptyConstraint(numVariables),
        ]);

        clearFeedback();
    }

    function removeConstraint(constraintIndex) {
        if (constraints.length <= 1) {
            return;
        }

        setConstraints((current) =>
            current.filter((_, currentIndex) => currentIndex !== constraintIndex)
        );

        clearFeedback();
    }

    function createProjectPayload() {
        return {
            title: isLoggedIn ? title.trim() : 'Projeto temporário',
            description: isLoggedIn ? description.trim() || null : null,
            num_variables: numVariables,
            num_constraints: constraints.length,
            optimization_type: optimizationType,
            objective_function: {
                coefficients: objectiveCoefficients.map(parseInputNumber),
            },
            constraints: constraints.map((constraint) => ({
                coefficients: constraint.coefficients.map(parseInputNumber),
                operator: constraint.operator,
                rhs_value: parseInputNumber(constraint.rhs_value),
            })),
        };
    }

    function validateModeling() {
        const missingProjectName = isLoggedIn && !title.trim();

        const firstTwoObjectiveAreFilled = objectiveCoefficients
            .slice(0, 2)
            .every((coefficient) => parseInputNumber(coefficient) !== 0);

        const hasInvalidConstraint = constraints.some((constraint) => {
            const hasAnyCoefficient = constraint.coefficients.some(
                (coefficient) => parseInputNumber(coefficient) !== 0
            );

            const hasRightSide =
                constraint.rhs_value !== '' &&
                constraint.rhs_value !== null &&
                constraint.rhs_value !== undefined;

            return !hasAnyCoefficient || !hasRightSide;
        });

        if (
            missingProjectName ||
            !firstTwoObjectiveAreFilled ||
            hasInvalidConstraint
        ) {
            return isLoggedIn
                ? 'Preencha o nome do projeto, os valores das variáveis e restrições antes de continuar.'
                : 'Preencha os valores das variáveis e restrições antes de continuar.';
        }

        return '';
    }

    async function handleMainAction() {
        const validationMessage = validateModeling();

        if (validationMessage) {
            setMessage(validationMessage);
            return;
        }

        setIsProcessing(true);
        setMessage('');

        try {
            const savedProjectId = await persistProject();

            if (!savedProjectId) {
                setMessage(
                    'Não foi possível identificar o projeto para calcular os resultados.'
                );
                return;
            }

            await window.axios.post(`/projects/${savedProjectId}/solve/simplex`);

            router.visit(route('project-results.show', savedProjectId));
        } catch (error) {
            setMessage(getErrorMessage(error));
        } finally {
            setIsProcessing(false);
        }
    }

    async function persistProject() {
        const payload = createProjectPayload();

        const endpoint = projectId ? `/projects/me/${projectId}` : '/projects';
        const method = projectId ? 'put' : 'post';

        const response = await window.axios[method](endpoint, payload);

        const savedProject =
            response.data?.data?.project ||
            response.data?.project ||
            response.data?.data;

        const savedProjectId = savedProject?.id ?? projectId;

        setProjectId(savedProjectId);

        return savedProjectId;
    }

    return (
        <>
            <Head title="Programação Linear/Inteira" />

            <main className="min-h-screen bg-white font-montserrat text-[#2b211b]">
                <Header auth={auth} activePage="simplex" />

                <section className="mx-auto max-w-[78rem] px-10 py-8">
                    <button
                        type="button"
                        onClick={() => router.visit(route('dashboard'))}
                        className="mb-8 text-4xl font-light text-[#653018] transition hover:-translate-x-1"
                        aria-label="Voltar"
                    >
                        ←
                    </button>

                    {isLoggedIn && (
                        <ProjectInformationSection
                            title={title}
                            description={description}
                            onTitleChange={updateTitle}
                            onDescriptionChange={updateDescription}
                        />
                    )}

                    <section className={isLoggedIn ? 'mt-16' : ''}>
                        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                            <div>
                                <div className="flex items-center gap-5">
                                    <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-[#733615]">
                                        <img
                                            src="/images/git-pull-request.png"
                                            alt=""
                                            className="h-8 w-8 object-contain"
                                        />
                                    </div>

                                    <h1 className="font-inter text-[2.2rem] font-black text-[#653018]">
                                        Programação Linear/Inteira
                                    </h1>
                                </div>

                                <p className="mt-5 max-w-[46rem] text-lg leading-relaxed text-[#777777]">
                                    Defina a função objetivo e as restrições do
                                    problema para calcular a solução ótima.
                                </p>
                            </div>

                            <div className="flex flex-col gap-3">
                                <OptimizationButton
                                    label="MAX Z"
                                    icon="/images/arrow-up-circled.png"
                                    selected={optimizationType === 'max'}
                                    onClick={() =>
                                        updateOptimizationType('max')
                                    }
                                />

                                <OptimizationButton
                                    label="MIN Z"
                                    icon="/images/arrow-down-circled.png"
                                    selected={optimizationType === 'min'}
                                    onClick={() =>
                                        updateOptimizationType('min')
                                    }
                                />
                            </div>
                        </div>

                        {!isLoggedIn && <GuestNotice />}

                        <ObjectiveFunctionCard
                            coefficients={objectiveCoefficients}
                            onChange={updateObjectiveCoefficient}
                            onAddVariable={addVariable}
                            onRemoveVariable={removeVariable}
                            canAddVariable={numVariables < 6}
                            canRemoveVariable={numVariables > 2}
                        />

                        <ConstraintsCard
                            constraints={constraints}
                            onAddConstraint={addConstraint}
                            onRemoveConstraint={removeConstraint}
                            onCoefficientChange={updateConstraintCoefficient}
                            onFieldChange={updateConstraintField}
                        />

                        {message && (
                            <div className="mt-8 rounded-xl bg-[#fff3cd] px-5 py-4 font-montserrat text-base font-semibold text-[#7a4b00]">
                                {message}
                            </div>
                        )}

                        <div className="mt-8 flex justify-center lg:justify-end">
                            <button
                                type="button"
                                onClick={handleMainAction}
                                disabled={isProcessing}
                                className="rounded-xl bg-[#a77b5f] px-10 py-4 font-inter text-xl font-black text-white shadow-md transition hover:bg-[#8d6349] disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {isProcessing
                                    ? 'Calculando...'
                                    : isLoggedIn
                                      ? projectId
                                          ? 'Atualizar e calcular'
                                          : 'Salvar e Calcular'
                                      : 'Continuar'}
                            </button>
                        </div>
                    </section>
                </section>

                <Footer />
            </main>
        </>
    );
}

function ProjectInformationSection({
    title,
    description,
    onTitleChange,
    onDescriptionChange,
}) {
    return (
        <section>
            <div className="flex items-center gap-5">
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-[#733615]">
                    <img
                        src="/images/folder-outline.png"
                        alt=""
                        className="h-8 w-8 object-contain"
                    />
                </div>

                <h1 className="font-inter text-[2.2rem] font-black text-[#653018]">
                    Informações
                </h1>
            </div>

            <p className="mt-6 max-w-[72rem] text-lg leading-relaxed text-[#777777]">
                Antes de iniciar a modelagem matemática, informe o nome e uma
                breve descrição do projeto. Essas informações facilitam a
                identificação, organização e reutilização do problema em
                consultas futuras.
            </p>

            <div className="mt-8 overflow-hidden rounded-xl bg-white shadow-md">
                <div className="bg-[#eadccb] px-6 py-4">
                    <h2 className="font-inter text-lg font-black text-[#653018]">
                        Identificação do Projeto
                    </h2>
                </div>

                <div className="space-y-6 px-8 py-7">
                    <TextField
                        label="Nome do Projeto *"
                        value={title}
                        onChange={onTitleChange}
                        placeholder="Ex.: Controle de Produção"
                    />

                    <label className="block">
                        <span className="font-montserrat text-sm font-bold text-[#653018]">
                            Descrição (opcional)
                        </span>

                        <textarea
                            value={description}
                            maxLength={100}
                            placeholder="Ex.: Otimização da produção de móveis para maximizar o lucro considerando matéria-prima e mão de obra."
                            onChange={(event) =>
                                onDescriptionChange(event.target.value)
                            }
                            className="mt-2 min-h-[4.5rem] w-full resize-none rounded-xl border border-[#d6bfa8] bg-[#fffaf4] px-4 py-3 font-montserrat text-[#653018] outline-none transition placeholder:text-[#c7c7c7] focus:ring-2 focus:ring-[#733615]"
                        />

                        <div className="mt-2 text-right text-sm text-[#777777]">
                            {description.length} / 100 caracteres
                        </div>
                    </label>
                </div>
            </div>
        </section>
    );
}

function GuestNotice() {
    return (
        <div className="mt-8 overflow-hidden rounded-xl bg-[#fffaf4] shadow-sm">
            <div className="bg-red-600 px-5 py-2 text-center font-inter text-sm font-black text-white">
                ATENÇÃO!!
            </div>

            <div className="px-6 py-4 text-center font-montserrat text-sm font-semibold leading-relaxed text-[#653018]">
                Você está usando o Simplex sem login. É possível montar e testar
                a modelagem, mas para salvar o projeto em “Meus Projetos” e
                acessar os resultados salvos, entre na sua conta.
            </div>
        </div>
    );
}

function OptimizationButton({ label, selected, onClick, icon }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`grid w-[16rem] grid-cols-[2.5rem_1fr_2.5rem] items-center rounded-xl border border-[#b38563] px-5 py-3 font-inter text-xl font-black shadow-md transition ${
                selected
                    ? 'bg-[#eadccb] text-[#653018]'
                    : 'bg-[#fffaf4] text-[#653018] hover:bg-[#eadccb]'
            }`}
        >
            <img
                src={icon}
                alt=""
                className="h-7 w-7 justify-self-start object-contain"
            />

            <span className="justify-self-center">{label}</span>

            <span />
        </button>
    );
}

function TextField({ label, value, onChange, placeholder }) {
    return (
        <label className="block">
            <span className="font-montserrat text-sm font-bold text-[#653018]">
                {label}
            </span>

            <input
                type="text"
                value={value}
                placeholder={placeholder}
                onChange={(event) => onChange(event.target.value)}
                className="mt-2 h-12 w-full rounded-xl border border-[#d6bfa8] bg-[#fffaf4] px-4 font-montserrat text-[#653018] outline-none transition placeholder:text-[#c7c7c7] focus:ring-2 focus:ring-[#733615]"
            />
        </label>
    );
}

function ObjectiveFunctionCard({
    coefficients,
    onChange,
    onAddVariable,
    onRemoveVariable,
    canAddVariable,
    canRemoveVariable,
}) {
    return (
        <section className="mt-8 overflow-hidden rounded-xl bg-white shadow-md">
            <div className="flex items-center justify-between bg-[#eadccb] px-6 py-4">
                <h2 className="flex items-center gap-3 font-inter text-lg font-black text-[#653018]">
                    <img
                        src="/images/sum.png"
                        alt=""
                        className="h-6 w-6 object-contain"
                    />
                    Função Objetivo (Z)
                </h2>

                <button
                    type="button"
                    onClick={onAddVariable}
                    disabled={!canAddVariable}
                    className="rounded-md bg-[#fffaf4] px-4 py-2 font-montserrat text-sm font-bold text-[#653018] shadow-sm transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
                >
                    + Adicionar Variável
                </button>
            </div>

            <div className="px-8 py-7">
                <div className="grid grid-cols-1 items-center gap-6 rounded-xl bg-[#eadccb] px-6 py-6 shadow-inner xl:grid-cols-[auto_1fr]">
                    <div className="flex items-center gap-4">
                        <img
                            src="/images/Z.png"
                            alt="Z"
                            className="h-16 w-16 object-contain"
                        />

                        <span className="font-inter text-2xl font-bold text-[#653018]">
                            =
                        </span>
                    </div>

                    <CoefficientGrid
                        coefficients={coefficients}
                        onChange={onChange}
                        showRemoveButton
                        canRemoveVariable={canRemoveVariable}
                        onRemoveVariable={onRemoveVariable}
                    />
                </div>
            </div>
        </section>
    );
}

function ConstraintsCard({
    constraints,
    onAddConstraint,
    onRemoveConstraint,
    onCoefficientChange,
    onFieldChange,
}) {
    return (
        <section className="mt-8 overflow-hidden rounded-xl bg-white shadow-md">
            <div className="flex items-center justify-between bg-[#eadccb] px-6 py-4">
                <h2 className="flex items-center gap-3 font-inter text-lg font-black text-[#653018]">
                    <img
                        src="/images/table.png"
                        alt=""
                        className="h-6 w-6 object-contain"
                    />
                    Restrições (Sujeito a)
                </h2>

                <button
                    type="button"
                    onClick={onAddConstraint}
                    className="rounded-md bg-[#fffaf4] px-4 py-2 font-montserrat text-sm font-bold text-[#653018] shadow-sm transition hover:bg-white"
                >
                    + Adicionar Restrição
                </button>
            </div>

            <div className="space-y-5 px-8 py-7">
                {constraints.map((constraint, constraintIndex) => (
                    <div
                        key={constraintIndex}
                        className="grid grid-cols-1 items-center gap-5 rounded-xl bg-[#eadccb] px-5 py-5 shadow-inner 2xl:grid-cols-[auto_minmax(0,1fr)_auto_auto]"
                    >
                        <div className="flex items-center gap-4">
                            <span className="rounded-lg bg-[#a77b5f] px-3 py-3 font-inter text-lg font-black text-white">
                                R{constraintIndex + 1}
                            </span>

                            <span className="font-inter text-2xl font-bold text-[#653018]">
                                =
                            </span>
                        </div>

                        <CoefficientGrid
                            coefficients={constraint.coefficients}
                            onChange={(coefficientIndex, value) =>
                                onCoefficientChange(
                                    constraintIndex,
                                    coefficientIndex,
                                    value
                                )
                            }
                        />

                        <div className="flex items-center border-l border-[#b38563] pl-5">
                            <div className="flex items-center rounded-xl bg-[#fffaf4] p-2 shadow">
                                <select
                                    value={constraint.operator}
                                    onChange={(event) =>
                                        onFieldChange(
                                            constraintIndex,
                                            'operator',
                                            event.target.value
                                        )
                                    }
                                    className="h-11 rounded-lg bg-[#a77b5f] px-3 font-inter text-base font-black text-white outline-none"
                                >
                                    <option value="<=">{'<='}</option>
                                    <option value=">=">{'>='}</option>
                                    <option value="=">=</option>
                                </select>

                                <input
                                    type="number"
                                    step="any"
                                    value={constraint.rhs_value}
                                    placeholder="Valor"
                                    onChange={(event) =>
                                        onFieldChange(
                                            constraintIndex,
                                            'rhs_value',
                                            event.target.value
                                        )
                                    }
                                    className="ml-3 h-11 w-32 rounded-lg border border-[#d6bfa8] bg-[#fff3e8] px-3 text-center font-montserrat text-[#653018] outline-none placeholder:text-[#b8b8b8] focus:ring-2 focus:ring-[#733615]"
                                />
                            </div>
                        </div>

                        <RemoveButton
                            label="Remover"
                            onClick={() => onRemoveConstraint(constraintIndex)}
                            disabled={constraints.length <= 1}
                        />
                    </div>
                ))}
            </div>
        </section>
    );
}

function CoefficientGrid({
    coefficients,
    onChange,
    showRemoveButton = false,
    canRemoveVariable = false,
    onRemoveVariable = () => {},
}) {
    return (
        <div className="grid grid-cols-1 gap-x-6 gap-y-5 md:grid-cols-2 xl:grid-cols-[repeat(auto-fit,minmax(10.5rem,1fr))]">
            {coefficients.map((coefficient, index) => (
                <div key={index} className="min-w-0 flex flex-col gap-2">
                    <div className="flex min-w-0 items-center gap-3">
                        {index > 0 && (
                            <span className="font-inter text-2xl font-bold text-[#653018]">
                                +
                            </span>
                        )}

                        <CoefficientInput
                            value={coefficient}
                            onChange={(value) => onChange(index, value)}
                        />

                        <VariableLabel variable={`x${index + 1}`} />
                    </div>

                    {showRemoveButton && (
                        <RemoveButton
                            label="Remover variável"
                            onClick={() => onRemoveVariable(index)}
                            disabled={!canRemoveVariable}
                            small
                        />
                    )}
                </div>
            ))}
        </div>
    );
}

function RemoveButton({ label, onClick, disabled, small = false }) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            className={`flex items-center gap-2 whitespace-nowrap font-montserrat font-black text-red-600 transition hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-30 ${
                small
                    ? 'ml-4 text-[0.7rem]'
                    : 'justify-center text-sm'
            }`}
        >
            <img
                src="/images/red-trash-outline.png"
                alt=""
                className={small ? 'h-4 w-4 object-contain' : 'h-5 w-5 object-contain'}
            />
            {label}
        </button>
    );
}

function CoefficientInput({ value, onChange }) {
    return (
        <input
            type="number"
            step="any"
            value={value}
            placeholder="0"
            onChange={(event) => onChange(event.target.value)}
            className="h-12 w-24 rounded-xl border border-[#d6bfa8] bg-[#fffaf4] text-center font-montserrat text-lg text-[#653018] shadow outline-none transition placeholder:text-[#c3c3c3] focus:ring-2 focus:ring-[#733615]"
        />
    );
}

function VariableLabel({ variable }) {
    return (
        <span className="whitespace-nowrap font-inter text-xl font-black text-[#653018]">
            {variable}
            <span className="ml-0.5 align-bottom text-[0.6rem] font-semibold text-[#777777]">
                coef.
            </span>
        </span>
    );
}

function buildInitialProjectState(project) {
    const title = project?.title || '';
    const description = project?.description || '';
    const optimizationType =
        project?.optimization_type?.value || project?.optimization_type || 'max';

    const objectiveCoefficients = normalizeCoefficients(
        project?.objective_function?.coefficients ||
            project?.objectiveFunction?.coefficients ||
            []
    );

    const numVariables = Math.max(
        Number(project?.num_variables || objectiveCoefficients.length || 2),
        2
    );

    const constraints = normalizeConstraints(
        project?.constraints || [],
        numVariables
    );

    return {
        title,
        description,
        optimizationType,
        numVariables,
        objectiveCoefficients:
            objectiveCoefficients.length > 0
                ? resizeCoefficients(objectiveCoefficients, numVariables)
                : createEmptyCoefficients(numVariables),
        constraints:
            constraints.length > 0
                ? constraints
                : [
                      createEmptyConstraint(numVariables),
                      createEmptyConstraint(numVariables),
                  ],
        projectId: project?.id || null,
    };
}

function createEmptyConstraint(variableCount) {
    return {
        coefficients: createEmptyCoefficients(variableCount),
        operator: '<=',
        rhs_value: '',
    };
}

function normalizeConstraints(constraints, variableCount) {
    if (!Array.isArray(constraints) || constraints.length === 0) {
        return [];
    }

    return constraints.map((constraint) => ({
        coefficients: resizeCoefficients(
            normalizeCoefficients(constraint?.coefficients || []),
            variableCount
        ),
        operator: constraint?.operator?.value || constraint?.operator || '<=',
        rhs_value: constraint?.rhs_value ?? '',
    }));
}

function createEmptyCoefficients(size) {
    return Array(size).fill('');
}

function resizeCoefficients(currentCoefficients, newSize) {
    return Array.from(
        { length: newSize },
        (_, index) => currentCoefficients[index] ?? ''
    );
}

function normalizeCoefficients(coefficients) {
    if (!Array.isArray(coefficients)) {
        return [];
    }

    return coefficients.map((value) =>
        value === null || value === undefined ? '' : String(value)
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
        'Não foi possível processar a solicitação.'
    );
}
