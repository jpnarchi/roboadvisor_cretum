import { GlobalWorkerOptions } from 'pdfjs-dist';

// Set the worker source to the worker file in node_modules
GlobalWorkerOptions.workerSrc = '/node_modules/pdfjs-dist/build/pdf.worker.min.js'; 