/**
 * This file was automatically generated. DO NOT MODIFY.
 */

export interface Progression {
  id: string;
  status: string;
}

export interface Question {
  id: string;
  number: string;
  area: string;
  title: string;
  answer: number;
}

export interface QuestionAnswer {
  id: string;
  questionId: string;
  title: string;
  score: number;
  activities: string;
}

export interface User {
  id: string;
  type?: string;
  email: string;
}

export interface UserAnswer {
  id: string;
  idAnswer?: string;
  idUser: string;
}
