// Blog posts. Use-case articles only — feature explanations live on
// /certificate-generator/<slug> and how-tos in the docs, so posts link to
// those instead of repeating them (avoids competing pages for one query).

export interface BlogPost {
  slug: string;
  title: string;
  description: string;
  datePublished: string; // YYYY-MM-DD
  intro: string;
  sections: { h2: string; paragraphs: string[] }[];
  links: { href: string; label: string }[];
}

export const BLOG_POSTS: BlogPost[] = [
  {
    slug: "how-to-create-certificates-in-wordpress",
    title: "How to Create Certificates in WordPress (Step by Step)",
    description:
      "A practical walkthrough for creating, issuing and verifying certificates in WordPress — from designing the background to bulk emailing PDFs with QR verification.",
    datePublished: "2026-10-08",
    intro:
      "WordPress has no built-in way to create certificates, but a certificate plugin can turn your site into a complete issuing system. This guide walks through the whole process using Certificate Generator: designing the certificate, adding recipients, generating PDFs, sending them, and letting people verify them.",
    sections: [
      {
        h2: "1. Design the certificate background",
        paragraphs: [
          "Start in any design tool — Canva is a popular choice. Create the border, logo, title and signatures, but leave blank space where the recipient's name, date and other details will go. Export it as a PNG or JPG, ideally A4 landscape.",
        ],
      },
      {
        h2: "2. Turn it into a template",
        paragraphs: [
          "In WordPress, go to Certificate Generator → Templates → Add New and upload the image. Drag the Name, Certificate Type, School and Date fields into the blank areas and set the font, size and colour of each. Click Preview — the sample PDF shows field boundaries so you can line everything up precisely.",
        ],
      },
      {
        h2: "3. Add the people receiving certificates",
        paragraphs: [
          "For a handful of people, add them one by one under Students. For a class or cohort, put them in a spreadsheet with the columns student_name, email, school_name, certificate_type and issue_date, save it as CSV, and upload it under Bulk Import.",
          "If your courses run on Tutor LMS, LearnDash, LifterLMS or Sensei — or you sell courses with WooCommerce — you can skip this step entirely and let certificates issue automatically on completion.",
        ],
      },
      {
        h2: "4. Set up email delivery",
        paragraphs: [
          "Certificates go out by email, so configure SMTP first with the free WP Mail SMTP plugin. The From Email must match your SMTP login exactly. Send a test from Settings → Email before sending to real recipients.",
        ],
      },
      {
        h2: "5. Send the certificates",
        paragraphs: [
          "Go to Bulk Send, filter to the group you want, preview the list and click Send Certificates. Each recipient gets a PDF with a unique serial number and a QR code. The queue runs in the background and retries failed emails automatically.",
        ],
      },
      {
        h2: "6. Let people verify them",
        paragraphs: [
          "Anyone who scans the QR code lands on a verification page on your site confirming the certificate is genuine. You can also add a verification form anywhere with the [cg_verify_certificate] shortcode, and a lookup page where students find their own certificates with [student_search].",
        ],
      },
    ],
    links: [
      { href: "/docs/certificate-generator/getting-started", label: "Getting started guide" },
      { href: "/certificate-generator/certificate-templates", label: "Certificate templates" },
      { href: "/certificate-generator/certificate-verification", label: "Certificate verification" },
    ],
  },
  {
    slug: "certificate-system-for-schools-and-training-institutes",
    title: "A Certificate System for Schools and Training Institutes",
    description:
      "How schools, coaching centres and training institutes can issue, deliver and verify certificates for students, teachers and partner schools from one WordPress site.",
    datePublished: "2026-10-08",
    intro:
      "Schools and training institutes issue certificates constantly — participation, completion, merit, competitions, teacher training. Doing it by hand in a design tool and a mail client works for ten certificates, not for five hundred. Here's how to run it as a system instead.",
    sections: [
      {
        h2: "Treat recipients as records, not rows in a spreadsheet",
        paragraphs: [
          "Certificate Generator stores students, teachers and schools as separate record types, each with its own email template. A training organisation working with several partner schools can keep everyone in one place and still send each group its own message.",
          "Records come in through CSV import, so your existing student spreadsheets are the starting point — no retyping.",
        ],
      },
      {
        h2: "One template per certificate type",
        paragraphs: [
          "Create a template for each kind of certificate you issue — participation, merit, completion. Each record's certificate type picks the matching template automatically, so a mixed list of students still gets the right design each.",
        ],
      },
      {
        h2: "Keep each event separate",
        paragraphs: [
          "Annual day, science fair and a summer workshop shouldn't blur together. Filter by event in the admin lists and in Bulk Send so you send one event's certificates without touching another's.",
        ],
      },
      {
        h2: "Let schools and students help themselves",
        paragraphs: [
          "Instead of answering \"can you resend my certificate?\" emails, add [student_search] to a page so students look up their own certificates by email. Partner schools can download all of their certificates at once with [school_bulk_certificate_download].",
        ],
      },
      {
        h2: "Make every certificate verifiable",
        paragraphs: [
          "Every certificate carries a serial number and a QR code linking to a public verification page — useful when a university or employer wants to confirm a certificate is real. Verification is free on every plan.",
        ],
      },
    ],
    links: [
      { href: "/certificate-generator/student-management", label: "Student, teacher & school records" },
      { href: "/certificate-generator/certificate-events", label: "Organise certificates by event" },
      { href: "/certificate-generator/bulk-certificate-generation", label: "Bulk certificate generation" },
    ],
  },
  {
    slug: "issuing-certificates-for-online-courses",
    title: "Issuing Certificates for Online Courses in WordPress",
    description:
      "Automatically issue course completion certificates from Tutor LMS, LearnDash, LifterLMS, Sensei or WooCommerce — including certificates for completing a multi-course track.",
    datePublished: "2026-10-08",
    intro:
      "If you sell or run online courses on WordPress, certificates should arrive the moment a learner finishes — not whenever someone gets around to making them. Here's how automatic issuance works with Certificate Generator.",
    sections: [
      {
        h2: "Connect your LMS",
        paragraphs: [
          "Certificate Generator works with Tutor LMS, LearnDash, LifterLMS and Sensei LMS course completion, and with WooCommerce order completion for courses or events you sell as products. The integrations are included on the Free plan.",
        ],
      },
      {
        h2: "Certificates for learning paths",
        paragraphs: [
          "Programmes made of several courses can use multi-course \"track\" certificates, which are issued only once the learner has completed every course in the track.",
        ],
      },
      {
        h2: "Know where every record came from",
        paragraphs: [
          "Records created by an LMS are tagged with their source, so you can tell them apart from CSV imports and filter Bulk Send by source when you need to resend to a specific course's learners.",
        ],
      },
      {
        h2: "Give learners something they can share",
        paragraphs: [
          "Learners can find their certificates through the [student_search] lookup page and add them to LinkedIn from the results. Anyone viewing the certificate can scan its QR code to confirm it's genuine.",
        ],
      },
    ],
    links: [
      { href: "/certificate-generator/lms-certificate-automation", label: "LMS certificate automation" },
      { href: "/certificate-generator/certificate-verification", label: "Certificate verification" },
      { href: "/certificate-generator/pricing", label: "Pricing" },
    ],
  },
];

export function getBlogPost(slug: string) {
  return BLOG_POSTS.find((p) => p.slug === slug);
}
