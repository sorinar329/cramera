/**
 * The diagnosis panel: every step whose first attempt failed, newest first. Each says
 * what went wrong, what segmind's detectors observed during the failed attempt, which
 * parameters the causal diagnosis judged the cause, the values they were corrected to,
 * and whether the corrected retry succeeded.
 */

import { DiagnosedStepKey, DiagnosesKey, DiagnosisStatus, ParameterCorrectionKey, ParameterVerdict } from '../protocol.js';
import { element } from './elements.js';
import { SidePanel } from './panel-host.js';

/**
 * What the panel says before any attempt failed.
 */
export const NO_DIAGNOSES = 'No attempt has failed yet. When one does, what went wrong, its causes and the corrected parameters appear here.';

/**
 * What the panel says about where its diagnoses come from.
 */
export const DIAGNOSIS_SOURCES = 'Segmind segments every failed attempt into events; the causal diagnosis judges its parameters against what successful attempts did and corrects the causes for the retry.';

/**
 * The words each recovery status is shown with.
 */
export const STATUS_LABELS = Object.freeze({
  [DiagnosisStatus.RETRYING]: 'Retrying with corrected parameters…',
  [DiagnosisStatus.RECOVERED]: 'Recovered',
  [DiagnosisStatus.NOT_RECOVERED]: 'Not recovered',
});

/**
 * The words each parameter verdict is shown with.
 */
export const VERDICT_LABELS = Object.freeze({
  [ParameterVerdict.PRIMARY_CAUSE]: 'primary cause',
  [ParameterVerdict.ANOMALOUS]: 'also a cause',
  [ParameterVerdict.PLAUSIBLE]: 'fine',
});

/**
 * How many decimals a parameter value is shown with.
 */
const VALUE_DECIMALS = 3;

// %% words

/**
 * @param {string} parameter A parameter's name, such as `grasp_closing_velocity`.
 * @returns {string} The name as words: `grasp closing velocity`.
 */
export function parameterLabel(parameter) {
  return parameter.replaceAll('_', ' ');
}

/**
 * @param {Object} step A diagnosed step.
 * @returns {string} Its recovery status in words, naming how many retries it took.
 */
export function statusText(step) {
  const status = step[DiagnosedStepKey.STATUS];
  const retries = step[DiagnosedStepKey.RETRIES];
  if (status !== DiagnosisStatus.RECOVERED) return STATUS_LABELS[status];
  return `${STATUS_LABELS[status]} after ${retries} ${retries === 1 ? 'retry' : 'retries'}`;
}

// %% panel

export class DiagnosisPanel {
  /**
   * The panel.
   * @type {SidePanel}
   */
  panel;

  /**
   * The revision of the diagnoses shown, or null before any were shown.
   * @type {number|null}
   */
  revision = null;

  /**
   * @param {Document} document The page.
   */
  constructor(document) {
    this.document = document;
    this.panel = new SidePanel('diagnosis', 'Diagnosis', element(document, 'section', 'diagnosis'));
    this.#render([]);
  }

  /**
   * Show the newest diagnoses, unless they are the ones shown.
   * @param {Object} diagnoses The published diagnoses.
   */
  show(diagnoses) {
    if (diagnoses[DiagnosesKey.REVISION] === this.revision) return;
    this.revision = diagnoses[DiagnosesKey.REVISION];
    this.#render(diagnoses[DiagnosesKey.STEPS]);
  }

  /**
   * Forget the diagnoses shown.
   */
  clear() {
    this.revision = null;
    this.#render([]);
  }

  /**
   * @param {Array<Object>} steps The diagnosed steps, oldest first.
   */
  #render(steps) {
    const document = this.document;
    const intro = element(document, 'p', 'muted', steps.length ? DIAGNOSIS_SOURCES : NO_DIAGNOSES);
    const list = element(document, 'ol', 'diagnosis-steps', null, [...steps].reverse().map((step) => this.#step(step)));
    this.panel.element.replaceChildren(intro, list);
  }

  /**
   * @param {Object} step A diagnosed step.
   * @returns {HTMLElement} Its card.
   */
  #step(step) {
    const document = this.document;
    const card = element(document, 'li', 'diagnosis-step', null, [
      element(document, 'header', 'diagnosis-header', null, [
        element(document, 'strong', '', step[DiagnosedStepKey.TITLE]),
        element(document, 'span', 'diagnosis-status', statusText(step)),
      ]),
      element(document, 'p', 'diagnosis-failure', step[DiagnosedStepKey.FAILURE]),
    ]);
    card.dataset.status = step[DiagnosedStepKey.STATUS];
    const observations = step[DiagnosedStepKey.OBSERVATIONS];
    if (observations.length) {
      card.append(
        element(document, 'h4', 'diagnosis-source', 'Segmind observed'),
        element(document, 'ul', 'diagnosis-observations', null, observations.map((text) => element(document, 'li', '', text))),
      );
    }
    const causes = step[DiagnosedStepKey.CORRECTIONS].filter((correction) => correction[ParameterCorrectionKey.VERDICT] !== ParameterVerdict.PLAUSIBLE);
    if (causes.length) {
      card.append(
        element(document, 'h4', 'diagnosis-source', 'Causal diagnosis'),
        element(document, 'ul', 'diagnosis-corrections', null, causes.map((correction) => this.#correction(correction))),
      );
    }
    return card;
  }

  /**
   * @param {Object} correction A judged parameter.
   * @returns {HTMLElement} Its row: the parameter, its verdict, the failed and the
   *   corrected value, and how well successful attempts support each.
   */
  #correction(correction) {
    const document = this.document;
    const failedSupport = correction[ParameterCorrectionKey.FAILED_SUPPORT];
    const correctedSupport = correction[ParameterCorrectionKey.CORRECTED_SUPPORT];
    const greatest = Math.max(failedSupport, correctedSupport) || 1;
    const row = element(document, 'li', 'diagnosis-correction', null, [
      element(document, 'div', 'diagnosis-parameter', null, [
        element(document, 'span', '', `${correction[ParameterCorrectionKey.ACTION]} · ${parameterLabel(correction[ParameterCorrectionKey.PARAMETER])}`),
        element(document, 'span', 'diagnosis-verdict', VERDICT_LABELS[correction[ParameterCorrectionKey.VERDICT]]),
      ]),
      element(document, 'div', 'diagnosis-values', null, [
        element(document, 'span', 'diagnosis-failed', correction[ParameterCorrectionKey.FAILED_VALUE].toFixed(VALUE_DECIMALS)),
        element(document, 'span', 'diagnosis-arrow', '→'),
        element(document, 'span', 'diagnosis-corrected', correction[ParameterCorrectionKey.CORRECTED_VALUE].toFixed(VALUE_DECIMALS)),
      ]),
      this.#support('failed', failedSupport / greatest),
      this.#support('corrected', correctedSupport / greatest),
    ]);
    row.dataset.verdict = correction[ParameterCorrectionKey.VERDICT];
    return row;
  }

  /**
   * @param {string} which `failed` or `corrected`.
   * @param {number} share The value's support relative to the better supported one.
   * @returns {HTMLElement} A bar of that length.
   */
  #support(which, share) {
    const bar = element(this.document, 'div', `diagnosis-support diagnosis-support-${which}`, null, [element(this.document, 'span', '')]);
    bar.title = `How well successful attempts support the ${which} value`;
    bar.firstChild.style.width = `${Math.round(share * 100)}%`;
    return bar;
  }
}
