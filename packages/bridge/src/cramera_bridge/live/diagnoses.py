"""
How the running process diagnosed its failed attempts, as it last published it.
"""

from __future__ import annotations

import threading
from dataclasses import dataclass, field, replace

from typing_extensions import List, Optional

from cramera_protocol.diagnoses import DiagnosedStep, Diagnoses

# %% board


@dataclass
class DiagnosisBoard:
    """
    Keeps the steps a process diagnosed, written by the process and read from HTTP
    threads.
    """

    steps: List[DiagnosedStep] = field(default_factory=list, init=False)
    """
    The diagnosed steps, oldest first.
    """

    revision: int = field(default=0, init=False)
    """
    Grows with every publication.
    """

    published: bool = field(default=False, init=False)
    """
    Whether any step was published.
    """

    lock: threading.Lock = field(default_factory=threading.Lock, init=False)
    """
    Guards the steps.
    """

    def publish(self, step: DiagnosedStep) -> None:
        """
        Add a step, or replace the published step of the same identity.

        :param step: The step as it stands now.
        """
        with self.lock:
            index: Optional[int] = next(
                (
                    position
                    for position, published in enumerate(self.steps)
                    if published.identifier == step.identifier
                ),
                None,
            )
            if index is None:
                self.steps.append(step)
            else:
                self.steps[index] = step
            self.revision += 1
            self.published = True

    def current(self) -> Diagnoses:
        """
        :return: Every step published so far.
        """
        with self.lock:
            return Diagnoses(
                steps=[replace(step) for step in self.steps], revision=self.revision
            )

    def is_published(self) -> bool:
        """
        :return: Whether any step was published.
        """
        with self.lock:
            return self.published
