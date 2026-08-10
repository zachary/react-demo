// Demo data for the resizable grid.
// Resizing is enabled via `defaultColDef: { resizable: true }` on the grid,
// so columns don't need a per-column flag.
export const demoColumnDefs = [
  { field: "name", headerName: "Name", width: 170 },
  { field: "age", headerName: "Age", width: 90 },
  { field: "country", headerName: "Country", width: 150 },
  { field: "occupation", headerName: "Occupation", width: 230 },
  { field: "salary", headerName: "Salary (USD)", width: 160 },
];

export const demoRowData = [
  { name: "Ava Thompson", age: 29, country: "USA", occupation: "Frontend Engineer", salary: 118000 },
  { name: "Liam Nakamura", age: 34, country: "Japan", occupation: "Product Manager", salary: 132000 },
  { name: "Maya Rodrigues", age: 27, country: "Brazil", occupation: "UX Designer", salary: 74000 },
  { name: "Noah van Dijk", age: 41, country: "Netherlands", occupation: "Data Scientist", salary: 143000 },
  { name: "Zoe Okafor", age: 31, country: "Nigeria", occupation: "DevOps Engineer", salary: 96000 },
  { name: "Ethan Kowalski", age: 38, country: "Poland", occupation: "Backend Engineer", salary: 108000 },
  { name: "Isla McGregor", age: 26, country: "UK", occupation: "Marketing Lead", salary: 82000 },
  { name: "Ravi Sharma", age: 45, country: "India", occupation: "Engineering Director", salary: 171000 },
  { name: "Chloe Laurent", age: 33, country: "France", occupation: "QA Engineer", salary: 78000 },
  { name: "Mateo Silva", age: 30, country: "Spain", occupation: "Mobile Developer", salary: 89000 },
  { name: "Freya Hansen", age: 36, country: "Denmark", occupation: "Security Analyst", salary: 101000 },
  { name: "Oliver Chen", age: 28, country: "Singapore", occupation: "Solutions Architect", salary: 124000 },
];
