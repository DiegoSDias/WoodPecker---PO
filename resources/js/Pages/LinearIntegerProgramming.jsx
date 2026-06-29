import Footer from '@/Components/Footer';
import Header from '@/Components/Header';
import { Head, router } from '@inertiajs/react';
import { useEffect, useState } from 'react';

export default function MathematicalModeling({ auth, project = null }) {
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
    const [isSaving, setIsSaving] = useState(false);
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

    const clearFeedback = () => {
        setMessage('');
    };

    const updateTitle = (value) => {
        setTitle(value);
        clearFeedback();
    };

    const updateDescription = (value) => {
        setDescription(value);
        clearFeedback();
    };

    const updateOptimizationType = (value) => {
        setOptimizationType(value);
        clearFeedback();
    };

    const addVariable = () => {
        if (numVariables >= 6) {
            return;
        }

        const nextCount = numVariables + 1;
        setNumVariables(nextCount);
        setObjectiveCoefficients((current) => resizeCoefficients(current, nextCount));
        setConstraints((current) =>
            current.map((constraint) => ({
                ...constraint,
                coefficients: resizeCoefficients(constraint.coefficients, nextCount),
            }))
        );
        clearFeedback();
    };

    const removeVariable = () => {
        if (numVariables <= 2) {
            return;
        }

        const nextCount = numVariables - 1;
        setNumVariables(nextCount);
        setObjectiveCoefficients((current) => resizeCoefficients(current, nextCount));
        setConstraints((current) =>
            current.map((constraint) => ({
                ...constraint,
                coefficients: resizeCoefficients(constraint.coefficients, nextCount),
            }))
        );
        clearFeedback();
    };

    const updateObjectiveCoefficient = (index, value) => {
        setObjectiveCoefficients((current) =>
            current.map((coefficient, currentIndex) =>
                currentIndex === index ? value : coefficient
            )
        );
        clearFeedback();
    };

    const updateConstraintCoefficient = (
        constraintIndex,
        coefficientIndex,
        value
    ) => {
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
    };

    const updateConstraintField = (constraintIndex, field, value) => {
        setConstraints((current) =>
            current.map((constraint, currentIndex) =>
                currentIndex === constraintIndex
                    ? { ...constraint, [field]: value }
                    : constraint
            )
        );
        clearFeedback();
    };

    const addConstraint = () => {
        setConstraints((current) => [
            ...current,
            createEmptyConstraint(numVariables),
        ]);
        clearFeedback();
    };

    const removeConstraint = (constraintIndex) => {
        if (constraints.length <= 1) {
            return;
        }

        setConstraints((current) =>
            current.filter((_, currentIndex) => currentIndex !== constraintIndex)
        );
        clearFeedback();
    };

    const createProjectPayload = () => ({
        title: title.trim() || 'Novo projeto',
        description: description.trim() || null,
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
    });

    const saveProject = async () => {
        setIsSaving(true);
        setMessage('');

        try {
            const payload = createProjectPayload();
            const endpoint = projectId ? `/projects/me/${projectId}` : '/projects';
            const method = projectId ? 'put' : 'post';

            const response = await window.axios[method](endpoint, payload);

            const savedProject =
                response.data?.data?.project ||
                response.data?.project ||
                response.data?.data;

            const savedProjectId = savedProject?.id ?? projectId;

            if (!savedProjectId) {
                setMessage(
                    'Projeto salvo, mas o identificador não foi encontrado no retorno.'
                );
                return;
            }

            setProjectId(savedProjectId);
            router.visit(route('project-results.show', savedProjectId));
        } catch (error) {
            setMessage(getErrorMessage(error));
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <>
            <Head title="Programação Linear/Inteira" />

            <main className="min-h-screen bg-white font-montserrat text-[#2b211b]">
                <Header auth={auth} activePage="novo-problema" />

                <section className="mx-auto max-w-[78rem] px-10 py-8">
                    <button
                        type="button"
                        onClick={() => router.visit('/')}
                        className="mb-8 text-4xl font-light text-[#653018] transition hover:-translate-x-1"
                        aria-label="Voltar"
                    >
                        ←
                    </button>

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
                                problema. Depois salve o projeto para seguir
                                para a tela de resultados.
                            </p>
                        </div>

                        <div className="flex flex-col gap-3">
                            <OptimizationButton
                                label="MAX Z"
                                icon="/images/arrow-up-circled.png"
                                selected={optimizationType === 'max'}
                                onClick={() => updateOptimizationType('max')}
                            />

                            <OptimizationButton
                                label="MIN Z"
                                icon="/images/arrow-down-circled.png"
                                selected={optimizationType === 'min'}
                                onClick={() => updateOptimizationType('min')}
                            />
                        </div>
                    </div>

                    <div className="mt-8 grid grid-cols-1 gap-5 lg:grid-cols-2">
                        <TextField
                            label="Título do projeto"
                            value={title}
                            onChange={updateTitle}
                            placeholder="Ex.: Problema de produção"
                        />

                        <TextField
                            label="Descrição"
                            value={description}
                            onChange={updateDescription}
                            placeholder="Descrição opcional"
                        />
                    </div>

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
                        <div className="mt-6 rounded-xl bg-[#fff3cd] px-5 py-4 font-montserrat text-sm font-semibold text-[#7a4b00]">
                            {message}
                        </div>
                    )}

                    <div className="mt-8 flex justify-center lg:justify-end">
                        <button
                            type="button"
                            onClick={saveProject}
                            disabled={isSaving}
                            className="rounded-xl bg-[#a77b5f] px-8 py-3 font-inter text-lg font-black text-white shadow-md transition hover:bg-[#8d6349] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {isSaving
                                ? 'Salvando...'
                                : projectId
                                  ? 'Atualizar e continuar'
                                  : 'Salvar projeto e continuar'}
                        </button>
                    </div>
                </section>

                <Footer />
            </main>
        </>
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
                className="mt-2 h-12 w-full rounded-xl border border-[#d6bfa8] bg-[#fffaf4] px-4 font-montserrat text-[#653018] outline-none transition placeholder:text-[#b8b8b8] focus:ring-2 focus:ring-[#733615]"
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

                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={onRemoveVariable}
                        disabled={!canRemoveVariable}
                        className="rounded-md bg-[#fffaf4] px-3 py-2 font-montserrat text-sm font-bold text-[#653018] shadow-sm transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
                    >
                        - Remover Variável
                    </button>

                    <button
                        type="button"
                        onClick={onAddVariable}
                        disabled={!canAddVariable}
                        className="rounded-md bg-[#fffaf4] px-3 py-2 font-montserrat text-sm font-bold text-[#653018] shadow-sm transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
                    >
                        + Adicionar Variável
                    </button>
                </div>
            </div>

            <div className="px-8 py-7">
                <div className="flex flex-wrap items-center gap-4 rounded-xl bg-[#eadccb] px-6 py-5">
                    <img
                        src="/images/Z.png"
                        alt="Z"
                        className="h-14 w-14 object-contain"
                    />

                    <span className="font-inter text-2xl font-bold text-[#653018]">
                        =
                    </span>

                    {coefficients.map((coefficient, index) => (
                        <div key={index} className="flex items-center gap-4">
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
                    ))}
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
                        className="grid grid-cols-1 items-center gap-4 rounded-xl bg-[#eadccb] px-5 py-5 lg:grid-cols-[auto_1fr_auto_auto]"
                    >
                        <div className="flex items-center gap-4">
                            <span className="rounded-lg bg-[#a77b5f] px-3 py-2 font-inter text-lg font-black text-white">
                                R{constraintIndex + 1}
                            </span>

                            <span className="font-inter text-2xl font-bold text-[#653018]">
                                =
                            </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-4">
                            {constraint.coefficients.map(
                                (coefficient, coefficientIndex) => (
                                    <div
                                        key={coefficientIndex}
                                        className="flex items-center gap-4"
                                    >
                                        {coefficientIndex > 0 && (
                                            <span className="font-inter text-2xl font-bold text-[#653018]">
                                                +
                                            </span>
                                        )}

                                        <CoefficientInput
                                            value={coefficient}
                                            onChange={(value) =>
                                                onCoefficientChange(
                                                    constraintIndex,
                                                    coefficientIndex,
                                                    value
                                                )
                                            }
                                        />

                                        <VariableLabel
                                            variable={`x${coefficientIndex + 1}`}
                                        />
                                    </div>
                                )
                            )}
                        </div>

                        <div className="flex items-center gap-3 border-l border-[#b38563] pl-5">
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
                                className="h-11 w-28 rounded-lg bg-[#fffaf4] px-3 text-center font-montserrat text-[#653018] shadow outline-none placeholder:text-[#b8b8b8] focus:ring-2 focus:ring-[#733615]"
                            />
                        </div>

                        <button
                            type="button"
                            onClick={() => onRemoveConstraint(constraintIndex)}
                            disabled={constraints.length <= 1}
                            className="font-montserrat text-sm font-bold text-red-600 transition hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-30"
                        >
                            Remover
                        </button>
                    </div>
                ))}
            </div>
        </section>
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
            className="h-12 w-28 rounded-xl bg-[#fffaf4] text-center font-montserrat text-lg text-[#653018] shadow outline-none transition placeholder:text-[#c3c3c3] focus:ring-2 focus:ring-[#733615]"
        />
    );
}

function VariableLabel({ variable }) {
    return (
        <span className="font-inter text-xl font-black text-[#653018]">
            {variable}
            <span className="ml-1 align-bottom text-[0.65rem] font-semibold text-[#777777]">
                coef.
            </span>
        </span>
    );
}

function buildInitialProjectState(project) {
    const title = project?.title || 'Novo projeto';
    const description = project?.description || '';
    const optimizationType = project?.optimization_type?.value || project?.optimization_type || 'max';
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
                : [createEmptyConstraint(numVariables), createEmptyConstraint(numVariables)],
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
