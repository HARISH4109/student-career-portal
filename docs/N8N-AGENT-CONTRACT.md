# n8n AI Agent Output JSON Contract & Schema

Use this contract and schema for your n8n AI Agent workflow. Our portal parses and auto-fills every field into the opportunity creation form.

---

## 1. Ready-to-Use JSON Schema for n8n AI Agent

Copy and paste this schema directly into your **Structured Output Parser** / **AI Agent Output Parser** in n8n:

```json
{
  "type": "object",
  "properties": {
    "title": {
      "type": "string",
      "description": "Job or internship title (e.g. 'Software Engineer', 'Data Analyst Intern')"
    },
    "companyName": {
      "type": "string",
      "description": "Name of the hiring company (e.g. 'Infosys', 'Google', 'Microsoft')"
    },
    "type": {
      "type": "string",
      "enum": ["job", "internship"],
      "description": "Must be exactly 'job' for full-time jobs or 'internship' for internships/training"
    },
    "description": {
      "type": "string",
      "description": "Full job/internship description including role overview, responsibilities, and perks"
    },
    "workMode": {
      "type": "string",
      "enum": ["onsite", "remote", "hybrid"],
      "description": "Must be exactly 'onsite', 'remote', or 'hybrid'"
    },
    "location": {
      "type": ["string", "null"],
      "description": "Location or city (e.g. 'Bangalore', 'PAN India'). If remote or unspecified, return null"
    },
    "salaryMin": {
      "type": ["number", "string", "null"],
      "description": "Minimum compensation/stipend in INR. If unpaid, return 0 or 'Unpaid'. If compensation is not disclosed or not specified, return null or 'Not Provided'."
    },
    "salaryMax": {
      "type": ["number", "string", "null"],
      "description": "Maximum compensation/stipend in INR. If unpaid, return 0 or 'Unpaid'. If compensation is not disclosed or not specified, return null or 'Not Provided'."
    },
    "applicationDeadline": {
      "type": ["string", "null"],
      "description": "Application deadline in ISO format YYYY-MM-DD (e.g. '2026-10-15'). If not specified, return null"
    },
    "applyUrl": {
      "type": ["string", "null"],
      "description": "Direct application URL, portal link, Google Form, Unstop, or careers page link. If not found, return null"
    },
    "applicationEmail": {
      "type": ["string", "null"],
      "description": "HR or application contact email address. If not found, return null"
    },
    "skills": {
      "type": "array",
      "items": { "type": "string" },
      "description": "List of technical and soft skills required (e.g. ['Java', 'Python', 'DBMS'])"
    },
    "eligibility": {
      "type": "object",
      "properties": {
        "minCgpa": {
          "type": ["number", "null"],
          "description": "Minimum CGPA cut-off (e.g. 7.5). If none specified, return null"
        },
        "departmentCodes": {
          "type": "array",
          "items": {
            "type": "string",
            "enum": ["CSE", "IT", "ECE", "AI-DS", "EEE", "ME", "CE"]
          },
          "description": "Eligible department codes (CSE, IT, ECE, AI-DS, EEE, ME, CE). If open to all or not specified, return []"
        },
        "allowedBatches": {
          "type": "array",
          "items": { "type": "integer" },
          "description": "Eligible graduation years (e.g. [2024, 2025, 2026]). If not specified, return []"
        },
        "description": {
          "type": ["string", "null"],
          "description": "Descriptive eligibility summary. Fill this in especially when structured fields (departmentCodes, allowedBatches, minCgpa) are empty or not strictly defined (e.g. 'Open to all engineering streams, 0 active backlogs'). Return null if all criteria are fully captured in structured fields."
        }
      },
      "required": ["departmentCodes", "allowedBatches"]
    },
    "confidenceScore": {
      "type": ["integer", "null"],
      "description": "AI confidence score between 0 and 100"
    }
  },
  "required": ["title", "companyName", "type", "description", "workMode", "skills"]
}
```

---

## 2. Salary Handling Rules (Handled Automatically by Portal & Agent)

| Scenario | Agent Can Return | Portal Displays | Form Field State |
|---|---|---|---|
| **Paid (Range)** | `salaryMin: 625000, salaryMax: 2100000` | `₹6.3L – ₹21.0L` | Min: `600000`, Max: `2100000` |
| **Paid (Single)** | `salaryMin: 800000, salaryMax: null` | `₹8.0L+` | Min: `800000` |
| **Unpaid** | `"Unpaid"` or `0` for both | `Unpaid` | Min: `0`, Max: `0` |
| **Not Disclosed** | `null` or `"Not Provided"` | `Not Provided` | Left empty |

> [!TIP]
> The backend portal automatically recognizes `"Unpaid"`, `"unpaid"`, `0`, and `"Not Provided"`, and normalizes them correctly so you never get schema errors.

---

## 3. Example JSON Responses

### Example A: Full-time Mass Hiring (With Apply Link & Email)
```json
{
  "title": "Systems Engineer - Mass Hiring",
  "companyName": "Infosys",
  "type": "job",
  "description": "Infosys is conducting a mass hiring drive for fresh engineering graduates across PAN India.",
  "workMode": "onsite",
  "location": "PAN India",
  "salaryMin": 625000,
  "salaryMax": 2100000,
  "applicationDeadline": "2026-10-15",
  "applyUrl": "https://careers.infosys.com/jobs/freshers-2026",
  "applicationEmail": "campus-hiring@infosys.com",
  "skills": ["Java", "Python", "Data Structures & Algorithms", "DBMS", "Operating Systems"],
  "eligibility": {
    "minCgpa": 6.5,
    "departmentCodes": ["CSE", "IT", "ECE"],
    "allowedBatches": [2025, 2026],
    "description": null
  },
  "confidenceScore": 95
}
```

### Example B: Unpaid Internship
```json
{
  "title": "Front-End Web Developer Intern",
  "companyName": "TechStart Labs",
  "type": "internship",
  "description": "2-month internship working on modern UI components using React and Tailwind CSS.",
  "workMode": "remote",
  "location": "Remote",
  "salaryMin": "Unpaid",
  "salaryMax": "Unpaid",
  "applicationDeadline": null,
  "applyUrl": "https://forms.gle/sampleform123",
  "applicationEmail": "hr@techstart.io",
  "skills": ["React", "JavaScript", "HTML/CSS", "Git & GitHub"],
  "eligibility": {
    "minCgpa": null,
    "departmentCodes": [],
    "allowedBatches": [],
    "description": "Open to all enrolled engineering students with a strong portfolio."
  },
  "confidenceScore": 88
}
```

### Example C: Salary Not Disclosed
```json
{
  "title": "Junior DevOps Engineer",
  "companyName": "CloudCorp",
  "type": "job",
  "description": "Maintain CI/CD pipelines and manage cloud deployments on AWS and Kubernetes.",
  "workMode": "hybrid",
  "location": "Hyderabad",
  "salaryMin": "Not Provided",
  "salaryMax": "Not Provided",
  "applicationDeadline": "2026-11-01",
  "applyUrl": "https://cloudcorp.com/careers/apply",
  "applicationEmail": null,
  "skills": ["AWS", "Docker", "Kubernetes", "Linux"],
  "eligibility": {
    "minCgpa": 7.0,
    "departmentCodes": ["CSE", "IT"],
    "allowedBatches": [2025],
    "description": null
  },
  "confidenceScore": 90
}
```
