export type Goat = {
  ID: string;
  Gender: "Male" | "Female" | "";
  Birthdate: string;
  Description: string;
  Barcode: string;
  Image: string;
  "Parent Buck": string;
  "Parent Doe": string;
  State: "Healthy" | "Sick" | "Pregnant" | "For Sale" | "Quarantine" | "";
  Deceased: "Y" | "N" | "";
  Weight: string;
  Remarks: string;
};

export const GOAT_HEADERS = [
  "ID",
  "Gender",
  "Birthdate",
  "Description",
  "Barcode",
  "Image",
  "Parent Buck",
  "Parent Doe",
  "State",
  "Deceased",
  "Weight",
  "Remarks"
] as const;
