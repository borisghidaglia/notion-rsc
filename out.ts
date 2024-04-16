export const Types = [
  { number: '{type: "number";number: number | null;id: string;}' },
  { url: '{type: "url";url: string | null;id: string;}' },
  {
    select:
      '{type: "select";select: SelectPropertyResponse | null;id: string;}',
  },
  {
    multi_select:
      '{type: "multi_select";multi_select: Array<SelectPropertyResponse>;id: string;}',
  },
  {
    status:
      '{type: "status";status: SelectPropertyResponse | null;id: string;}',
  },
  { date: '{type: "date";date: DateResponse | null;id: string;}' },
  { email: '{type: "email";email: string | null;id: string;}' },
  {
    phone_number:
      '{type: "phone_number";phone_number: string | null;id: string;}',
  },
  { checkbox: '{type: "checkbox";checkbox: boolean;id: string;}' },
  {
    files:
      '{type: "files";files: Array<{    file: {        url: string;        expiry_time: string;    };    name: StringRequest;    type?: "file";} | {    external: {        url: TextRequest;    };    name: StringRequest;    type?: "external";}>;id: string;}',
  },
  {
    created_by:
      '{type: "created_by";created_by: PartialUserObjectResponse | UserObjectResponse;id: string;}',
  },
  { created_time: '{type: "created_time";created_time: string;id: string;}' },
  {
    last_edited_by:
      '{type: "last_edited_by";last_edited_by: PartialUserObjectResponse | UserObjectResponse;id: string;}',
  },
  {
    last_edited_time:
      '{type: "last_edited_time";last_edited_time: string;id: string;}',
  },
  { formula: '{type: "formula";formula: FormulaPropertyResponse;id: string;}' },
  {
    unique_id:
      '{type: "unique_id";unique_id: {    prefix: string | null;    number: number | null;};id: string;}',
  },
  {
    verification:
      '{type: "verification";verification: VerificationPropertyUnverifiedResponse | null | VerificationPropertyResponse | null;id: string;}',
  },
  { title: '{type: "title";title: Array<RichTextItemResponse>;id: string;}' },
  {
    rich_text:
      '{type: "rich_text";rich_text: Array<RichTextItemResponse>;id: string;}',
  },
  {
    people:
      '{type: "people";people: Array<PartialUserObjectResponse | UserObjectResponse>;id: string;}',
  },
  {
    relation:
      '{type: "relation";relation: Array<{    id: string;}>;id: string;}',
  },
  {
    rollup:
      '{type: "rollup";rollup: {    type: "number";    number: number | null;    function: RollupFunction;} | {    type: "date";    date: DateResponse | null;    function: RollupFunction;} | {    type: "array";    array: Array<{        type: "number";        number: number | null;    } | {        type: "url";        url: string | null;    } | {        type: "select";        select: SelectPropertyResponse | null;    } | {        type: "multi_select";        multi_select: Array<SelectPropertyResponse>;    } | {        type: "status";        status: SelectPropertyResponse | null;    } | {        type: "date";        date: DateResponse | null;    } | {        type: "email";        email: string | null;    } | {        type: "phone_number";        phone_number: string | null;    } | {        type: "checkbox";        checkbox: boolean;    } | {        type: "files";        files: Array<{            file: {                url: string;                expiry_time: string;            };            name: StringRequest;            type?: "file";        } | {            external: {                url: TextRequest;            };            name: StringRequest;            type?: "external";        }>;    } | {        type: "created_by";        created_by: PartialUserObjectResponse | UserObjectResponse;    } | {        type: "created_time";        created_time: string;    } | {        type: "last_edited_by";        last_edited_by: PartialUserObjectResponse | UserObjectResponse;    } | {        type: "last_edited_time";        last_edited_time: string;    } | {        type: "formula";        formula: FormulaPropertyResponse;    } | {        type: "unique_id";        unique_id: {            prefix: string | null;            number: number | null;        };    } | {        type: "verification";        verification: VerificationPropertyUnverifiedResponse | null | VerificationPropertyResponse | null;    } | {        type: "title";        title: Array<RichTextItemResponse>;    } | {        type: "rich_text";        rich_text: Array<RichTextItemResponse>;    } | {        type: "people";        people: Array<PartialUserObjectResponse | UserObjectResponse>;    } | {        type: "relation";        relation: Array<{            id: string;        }>;    }>;    function: RollupFunction;};id: string;}',
  },
] as const;
