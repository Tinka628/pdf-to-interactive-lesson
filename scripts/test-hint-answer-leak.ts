#!/usr/bin/env tsx

import assert from "node:assert/strict";
import { detectHintAnswerLeak } from "../lib/hint-answer-leak";
import {
  combinedFlowSchema,
  fixFlowDiagramSchema,
  flowQuestionSchema,
  standardLessonsSchema,
} from "../lib/schemas";

const leak = (input: Parameters<typeof detectHintAnswerLeak>[0]) =>
  detectHintAnswerLeak(input);

function assertLeak(input: Parameters<typeof detectHintAnswerLeak>[0], severity = "direct") {
  const result = leak(input);
  assert.equal(result.leaksAnswer, true, JSON.stringify(result, null, 2));
  assert.equal(result.severity, severity, JSON.stringify(result, null, 2));
}

function assertNoLeak(input: Parameters<typeof detectHintAnswerLeak>[0]) {
  const result = leak(input);
  assert.equal(result.leaksAnswer, false, JSON.stringify(result, null, 2));
  assert.equal(result.severity, "none", JSON.stringify(result, null, 2));
}

assertLeak({
  questionType: "short-answer",
  hint: "The base model selected for Composer 2 was Kimi K2.5.",
  answer: "Kimi K2.5",
});

assertNoLeak({
  questionType: "short-answer",
  hint: "Look for the base model chosen after comparing candidate models.",
  answer: "Kimi K2.5",
});

assertLeak({
  questionType: "multiple-choice",
  hint: "CursorBench tasks require a median of 181 lines changed.",
  answer: 3,
  choices: [390, 10, 7, 181],
});

assertLeak({
  questionType: "multiple-choice",
  hint: "The fourth choice is the one supported by the report.",
  answer: 3,
  choices: [390, 10, 7, 181],
});

assertNoLeak({
  questionType: "multiple-choice",
  hint: "Compare the reported median for CursorBench against the public benchmarks.",
  answer: 3,
  choices: [390, 10, 7, 181],
});

assertLeak({
  questionType: "true-false",
  hint: "The statement is false.",
  answer: false,
});

assertNoLeak({
  questionType: "true-false",
  hint: "Compare the statement against the sequence described in the lesson.",
  answer: false,
});

assertLeak({
  questionType: "flow-diagram",
  hint: "The pipeline goes from Select Base Model to Continued Pretraining to RL Training.",
  answer: [0, 1, 2],
  choices: ["Select Base Model", "Continued Pretraining", "RL Training"],
  slots: ["First", "Second", "Third"],
});

assertNoLeak({
  questionType: "flow-diagram",
  hint: "Trace how the training process builds from preparation into optimization.",
  answer: [0, 1, 2],
  choices: ["Select Base Model", "Continued Pretraining", "RL Training"],
  slots: ["First", "Second", "Third"],
});

assert.equal(
  standardLessonsSchema.safeParse({
    lessons: [
      {
        title: "Base model selection",
        content: "Composer 2 selected Kimi K2.5 after internal evaluations.",
        question: "Which base model was selected for Composer 2?",
        questionType: "short-answer",
        answer: "Kimi K2.5",
      },
      {
        title: "Training phases",
        content: "Composer 2 used continued pretraining followed by reinforcement learning.",
        question: "Composer 2 used reinforcement learning after continued pretraining.",
        questionType: "true-false",
        answer: true,
      },
      {
        title: "CursorBench changes",
        content: "CursorBench tasks require a median of 181 lines changed.",
        question: "What median change size does CursorBench require?",
        questionType: "multiple-choice",
        answer: 0,
        choices: [181, 390, 10, 7],
        explanation: "The report states that CursorBench has a median of 181 lines changed.",
      },
    ],
  }).success,
  true
);

assert.equal(
  flowQuestionSchema.safeParse({
    title: "Training sequence",
    content: "The process starts with base model selection, then continued pretraining, then reinforcement learning.",
    question: "What is the correct order of the Composer 2 training sequence?",
    stepsInOrder: ["Select Base Model", "Continued Pretraining", "RL Training"],
  }).success,
  true
);

assert.equal(
  combinedFlowSchema.safeParse({
    hasFlow: true,
    flowConfig: {
      nodes: [
        { id: "step-1", label: "Select Base Model", type: "start" },
        { id: "step-2", label: "Continued Pretraining", type: "process" },
        { id: "step-3", label: "RL Training", type: "output" },
      ],
      edges: [
        ["step-1", "step-2"],
        ["step-2", "step-3"],
      ],
    },
    title: "Training sequence",
    content: "The process starts with base model selection, then continued pretraining, then reinforcement learning.",
    question: "What is the correct order of the Composer 2 training sequence?",
    stepsInOrder: ["Select Base Model", "Continued Pretraining", "RL Training"],
  }).success,
  true
);

assert.equal(
  fixFlowDiagramSchema.safeParse({
    title: "Training sequence",
    content: "The process starts with base model selection, then continued pretraining, then reinforcement learning.",
    question: "What is the correct order of the Composer 2 training sequence?",
    choices: ["Select Base Model", "Continued Pretraining", "RL Training"],
    slots: ["First", "Second", "Third"],
    answer: [0, 1, 2],
  }).success,
  true
);

console.log("hint-answer-leak and schema resilience tests passed");
