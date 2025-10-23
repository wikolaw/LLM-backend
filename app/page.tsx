export default function Home() {
  return (
    <main className="min-h-screen p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold mb-4">
          LLM Document Analysis Demo
        </h1>
        <p className="text-lg text-gray-600 mb-8">
          Upload documents, adjust prompts, run multiple LLM models, and compare results.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 border rounded-lg">
            <h2 className="text-xl font-semibold mb-2">1. Upload Document</h2>
            <p className="text-gray-600">
              Upload PDF, DOCX, or TXT files for analysis
            </p>
          </div>

          <div className="p-6 border rounded-lg">
            <h2 className="text-xl font-semibold mb-2">2. Adjust Prompt</h2>
            <p className="text-gray-600">
              Customize prompts to control model behavior
            </p>
          </div>

          <div className="p-6 border rounded-lg">
            <h2 className="text-xl font-semibold mb-2">3. Compare Results</h2>
            <p className="text-gray-600">
              Run multiple models and compare outputs
            </p>
          </div>
        </div>

        <div className="mt-8 flex gap-4">
          <a
            href="/auth/login"
            className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold"
          >
            Get Started →
          </a>
          <a
            href="/dashboard"
            className="inline-block px-6 py-3 border-2 border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition font-semibold"
          >
            Go to Dashboard
          </a>
        </div>

        {/* Features */}
        <div className="mt-16 pt-16 border-t">
          <h2 className="text-2xl font-bold mb-8">Key Features</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-6 bg-blue-50 rounded-lg">
              <h3 className="font-semibold text-lg mb-2">📊 Multi-Model Comparison</h3>
              <p className="text-gray-600 text-sm">
                Run up to 16 different LLM models in parallel and compare their extraction accuracy
              </p>
            </div>
            <div className="p-6 bg-green-50 rounded-lg">
              <h3 className="font-semibold text-lg mb-2">🇸🇪 Swedish Text Optimized</h3>
              <p className="text-gray-600 text-sm">
                Specifically designed for Swedish railway infrastructure contracts
              </p>
            </div>
            <div className="p-6 bg-purple-50 rounded-lg">
              <h3 className="font-semibold text-lg mb-2">💰 Cost Analysis</h3>
              <p className="text-gray-600 text-sm">
                Track token usage and costs for each model. Free tier models available
              </p>
            </div>
            <div className="p-6 bg-yellow-50 rounded-lg">
              <h3 className="font-semibold text-lg mb-2">⚡ Fast Extraction</h3>
              <p className="text-gray-600 text-sm">
                Parallel execution with average response time under 5 seconds
              </p>
            </div>
          </div>
        </div>

        {/* Available Models */}
        <div className="mt-16 pt-16 border-t">
          <h2 className="text-2xl font-bold mb-4">Available Models</h2>
          <p className="text-gray-600 mb-8">
            Choose from 16 pre-configured models including free options
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="p-4 border rounded-lg">
              <p className="font-semibold">Claude 3.5 Sonnet</p>
              <span className="text-xs text-purple-600">Premium</span>
            </div>
            <div className="p-4 border rounded-lg">
              <p className="font-semibold">GPT-4 Turbo</p>
              <span className="text-xs text-purple-600">Premium</span>
            </div>
            <div className="p-4 border rounded-lg">
              <p className="font-semibold">Llama 3.1 8B</p>
              <span className="text-xs text-green-600">Free</span>
            </div>
            <div className="p-4 border rounded-lg">
              <p className="font-semibold">Mistral 7B</p>
              <span className="text-xs text-green-600">Free</span>
            </div>
            <div className="p-4 border rounded-lg">
              <p className="font-semibold">Gemini 1.5 Pro</p>
              <span className="text-xs text-blue-600">Budget</span>
            </div>
            <div className="p-4 border rounded-lg">
              <p className="font-semibold">Mixtral 8x7B</p>
              <span className="text-xs text-blue-600">Budget</span>
            </div>
            <div className="p-4 border rounded-lg text-center col-span-2">
              <p className="text-gray-600">+ 10 more models</p>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
