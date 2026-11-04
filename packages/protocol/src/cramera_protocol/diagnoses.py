"""
How a running demo diagnosed its failed attempts: what was observed to go wrong, which
parameters were judged the cause and the values they were corrected to, and whether the
corrected retry succeeded.
"""

from __future__ import annotations

from dataclasses import dataclass
from enum import StrEnum

from typing_extensions import List

from cramera_protocol.document import JsonDocument, document_field

# %% parameters


class ParameterVerdict(StrEnum):
    """
    How a parameter of a failed attempt was judged.
    """

    PRIMARY_CAUSE = "primary_cause"
    """
    The parameter least supported by the successful attempts: the failure's main cause.
    """

    ANOMALOUS = "anomalous"
    """
    The successful attempts support the parameter's value too little; a further cause.
    """

    PLAUSIBLE = "plausible"
    """
    The successful attempts support the parameter's value well enough.
    """


class ParameterCorrectionKey(StrEnum):
    """
    The keys of one parameter of a failed attempt and its corrected value.
    """

    ACTION = "action"
    """
    The action the parameter belongs to.
    """

    PARAMETER = "parameter"
    """
    The parameter's name.
    """

    FAILED_VALUE = "failedValue"
    """
    The value the failed attempt used.
    """

    FAILED_SUPPORT = "failedSupport"
    """
    How well the successful attempts support the failed value.
    """

    CORRECTED_VALUE = "correctedValue"
    """
    The value the retry uses.
    """

    CORRECTED_SUPPORT = "correctedSupport"
    """
    How well the successful attempts support the corrected value.
    """

    VERDICT = "verdict"
    """
    How the parameter was judged.
    """


@dataclass(kw_only=True)
class ParameterCorrection(JsonDocument):
    """
    One parameter of a failed attempt, how it was judged and the value it was corrected
    to.
    """

    action: str = document_field(ParameterCorrectionKey.ACTION)
    """
    The action the parameter belongs to.
    """

    parameter: str = document_field(ParameterCorrectionKey.PARAMETER)
    """
    The parameter's name.
    """

    failed_value: float = document_field(ParameterCorrectionKey.FAILED_VALUE)
    """
    The value the failed attempt used.
    """

    failed_support: float = document_field(ParameterCorrectionKey.FAILED_SUPPORT)
    """
    How well the successful attempts support :attr:`failed_value`, as a density.
    """

    corrected_value: float = document_field(ParameterCorrectionKey.CORRECTED_VALUE)
    """
    The value the retry uses.
    """

    corrected_support: float = document_field(
        ParameterCorrectionKey.CORRECTED_SUPPORT
    )
    """
    How well the successful attempts support :attr:`corrected_value`, as a density.
    """

    verdict: ParameterVerdict = document_field(ParameterCorrectionKey.VERDICT)
    """
    How the parameter was judged.
    """


# %% steps


class DiagnosisStatus(StrEnum):
    """
    How far the diagnosis and recovery of one failed step has come.
    """

    RETRYING = "retrying"
    """
    The failure is diagnosed and the corrected retry runs.
    """

    RECOVERED = "recovered"
    """
    A corrected retry succeeded.
    """

    NOT_RECOVERED = "not_recovered"
    """
    Every corrected retry failed.
    """


class DiagnosedStepKey(StrEnum):
    """
    The keys of one diagnosed step.
    """

    IDENTIFIER = "id"
    """
    The step's identity.
    """

    TITLE = "title"
    """
    What the step does.
    """

    FAILURE = "failure"
    """
    What went wrong.
    """

    OBSERVATIONS = "observations"
    """
    What the event detectors observed during the failed attempt.
    """

    CORRECTIONS = "corrections"
    """
    The judged parameters.
    """

    STATUS = "status"
    """
    How far the recovery has come.
    """

    RETRIES = "retries"
    """
    How many corrected retries were made.
    """


@dataclass(kw_only=True)
class DiagnosedStep(JsonDocument):
    """
    One step whose first attempt failed: what went wrong, why, and how it was
    recovered.
    """

    identifier: str = document_field(DiagnosedStepKey.IDENTIFIER)
    """
    The step's identity, unique within a run.
    """

    title: str = document_field(DiagnosedStepKey.TITLE)
    """
    What the step does.
    """

    failure: str = document_field(DiagnosedStepKey.FAILURE)
    """
    What went wrong, in a sentence.
    """

    observations: List[str] = document_field(
        DiagnosedStepKey.OBSERVATIONS, default_factory=list
    )
    """
    What the event detectors observed during the failed attempt, oldest first.
    """

    corrections: List[ParameterCorrection] = document_field(
        DiagnosedStepKey.CORRECTIONS, default_factory=list
    )
    """
    Every judged parameter, the causes first.
    """

    status: DiagnosisStatus = document_field(
        DiagnosedStepKey.STATUS, default=DiagnosisStatus.RETRYING
    )
    """
    How far the recovery has come.
    """

    retries: int = document_field(DiagnosedStepKey.RETRIES, default=0)
    """
    How many corrected retries were made.
    """


class DiagnosesKey(StrEnum):
    """
    The keys of every diagnosis of a publisher.
    """

    STEPS = "steps"
    """
    The diagnosed steps.
    """

    REVISION = "revision"
    """
    Changes whenever a step is added or changes.
    """


@dataclass(kw_only=True)
class Diagnoses(JsonDocument):
    """
    Every step a running process diagnosed.
    """

    steps: List[DiagnosedStep] = document_field(
        DiagnosesKey.STEPS, default_factory=list
    )
    """
    The diagnosed steps, oldest first.
    """

    revision: int = document_field(DiagnosesKey.REVISION, default=0)
    """
    Grows whenever a step is added or changes.
    """

