export namespace Progression {

  export class Resource {
    id?: string;
    status: string;
  }

  export var schema = {
        "$schema": "http://json-schema.org/draft-04/schema#",
        "id": "/model/progression.json",
        "type": "object",
        "properties": {
                "id": {
                        "type": "string"
                },
                "status": {
                        "type": "string"
                }
        },
        "required": [
                "status"
        ]
}
}

export namespace Question {

  export class Resource {
    id: string;
    number: string;
    learningArea: string;
    title: string;
    answer: number;
  }

  export var schema = {
        "$schema": "http://json-schema.org/draft-04/schema#",
        "id": "/model/question.json",
        "type": "object",
        "properties": {
                "id": {
                        "type": "string"
                },
                "number": {
                        "type": "string"
                },
                "learningArea": {
                        "type": "string"
                },
                "title": {
                        "type": "string"
                },
                "answer": {
                        "type": "number"
                }
        },
        "required": [
                "id",
                "number",
                "learningArea",
                "title",
                "answer"
        ]
}
}

export namespace QuestionAnswer {

  export class Resource {
    id: string;
    questionId: string;
    title: string;
    score: number;
    activities: string;
  }

  export var schema = {
        "$schema": "http://json-schema.org/draft-04/schema#",
        "id": "/model/questionAnswer.json",
        "type": "object",
        "properties": {
                "id": {
                        "type": "string"
                },
                "questionId": {
                        "type": "string"
                },
                "title": {
                        "type": "string"
                },
                "score": {
                        "type": "number"
                },
                "activities": {
                        "type": "string"
                }
        },
        "required": [
                "id",
                "questionId",
                "title",
                "score",
                "activities"
        ]
}
}

export namespace User {

  export class Resource {
    id?: string;
    type?: string;
    email: string;
  }

  export var schema = {
        "$schema": "http://json-schema.org/draft-04/schema#",
        "id": "/model/user.json",
        "type": "object",
        "properties": {
                "id": {
                        "type": "string"
                },
                "type": {
                        "type": "string"
                },
                "email": {
                        "type": "string"
                }
        },
        "required": [
                "email"
        ]
}
}

export namespace UserAnswer {

  export class Resource {
    id?: string;
    idAnswer?: string;
    idUser: string;
  }

  export var schema = {
        "$schema": "http://json-schema.org/draft-04/schema#",
        "id": "/model/userAnswer.json",
        "type": "object",
        "properties": {
                "id": {
                        "type": "string"
                },
                "idAnswer": {
                        "type": "string"
                },
                "idUser": {
                        "type": "string"
                }
        },
        "required": [
                "idQuestionAnswer",
                "idUser"
        ]
}
}
