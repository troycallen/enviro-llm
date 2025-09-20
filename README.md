# EnviroLLM: Practical Resource Tracking and Optimization for Local AI

An open-source toolkit for tracking, benchmarking, and optimizing energy and resource usage when running Large Language Models (LLMs) on laptops and desktops.

🌐 **Live Site**: [envirollm.com](https://envirollm.com)

## Project Overview

Large language models are increasingly being deployed locally for privacy and accessibility reasons. However, users currently lack tools to measure or optimize their energy and resource impact. EnviroLLM aims to fill this gap by providing practical monitoring and optimization capabilities.

### Key Features (Planned)
- **Real-time Monitoring**: Track energy consumption and resource usage with visual dashboards
- **Model Optimization**: Reduce energy usage through quantization, pruning, and compression techniques
- **Benchmarking**: Compare local vs. cloud deployment impacts
- **Visual Feedback**: Clear performance vs. efficiency trade-offs

## Technology Stack

- **Frontend**: Next.js, React, TypeScript, Tailwind CSS
- **Backend**: Python, FastAPI, PyTorch/TensorFlow
- **Deployment**: Vercel (Frontend), Railway/Render (Backend)
- **Version Control**: GitHub with CI/CD pipeline

## Development Timeline

- **Weeks 1-4**: Review existing tools, establish baseline measurement, design dashboard
- **Weeks 5-8**: Integrate optimization techniques, implement energy/accuracy tracking, release prototype
- **Weeks 9-12**: Expand benchmarks, user testing, complete case studies
- **Weeks 13-16**: Incorporate feedback, finalize toolkit, documentation

## Getting Started

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

### Prerequisites
- Node.js 18+ 
- npm, yarn, pnpm, or bun

### Installation

```bash
# Clone the repository
git clone https://github.com/troycallen/envirollm
cd envirollm

# Install dependencies
npm install

# Run the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

## Project Structure

```
envirollm/
├── app/                    # Next.js app directory
│   ├── globals.css        # Global styles
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Homepage
├── public/                # Static assets
├── components/            # Reusable components (coming soon)
└── README.md
```

## Contributing

This project is part of CS 8903-CROCS (Computing Research Opportunities for Conservation and Sustainability) at Georgia Tech. 

### Background

My background is in systems and ML optimization. Volunteering with environmental organizations in Atlanta and New Smyrna Beach inspired my commitment to developing sustainable technology solutions.

## Deployment

The application is automatically deployed to [envirollm.com](https://envirollm.com) via Vercel when changes are pushed to the main branch.

## License

This project is open-source and available under the [MIT License](LICENSE).
