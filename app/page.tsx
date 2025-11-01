'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { User } from '@supabase/supabase-js'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

// Types
interface RecentBatch {
  id: string
  name: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  created_at: string
  total_documents: number
  successful_runs: number
  failed_runs: number
  completed_documents: number
}

interface UserStats {
  totalBatches: number
  totalDocuments: number
  avgSuccessRate: number
  totalCost: number
}

export default function Home() {
  const router = useRouter()
  const supabase = createClient()

  // Auth state
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)
  const [user, setUser] = useState<User | null>(null)

  // Logged-in user data
  const [recentBatches, setRecentBatches] = useState<RecentBatch[]>([])
  const [userStats, setUserStats] = useState<UserStats | null>(null)
  const [isLoadingData, setIsLoadingData] = useState(false)

  // Check authentication
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        setUser(user)

        // If user is logged in, fetch their data
        if (user) {
          fetchUserData(user.id)
        }
      } catch (error) {
        console.error('Auth check error:', error)
      } finally {
        setIsCheckingAuth(false)
      }
    }

    checkAuth()
  }, [])

  // Fetch user's recent batches and stats
  const fetchUserData = async (userId: string) => {
    setIsLoadingData(true)

    try {
      // Fetch recent batches
      const { data: batches } = await supabase
        .from('batch_jobs')
        .select('id, name, status, created_at, total_documents, successful_runs, failed_runs, completed_documents')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(3)

      if (batches) {
        setRecentBatches(batches)
      }

      // Fetch aggregate stats
      const { data: allBatches } = await supabase
        .from('batch_jobs')
        .select('total_documents, successful_runs, failed_runs, status')
        .eq('user_id', userId)

      if (allBatches) {
        const stats: UserStats = {
          totalBatches: allBatches.length,
          totalDocuments: allBatches.reduce((sum, b) => sum + (b.total_documents || 0), 0),
          avgSuccessRate: calculateAvgSuccessRate(allBatches),
          totalCost: 0, // Will be calculated from batch_analytics if needed
        }

        // Fetch total cost from analytics
        const batchIds = allBatches.map(b => b.id)
        if (batchIds.length > 0) {
          const { data: analytics } = await supabase
            .from('batch_analytics')
            .select('total_cost')
            .in('batch_job_id', batchIds)

          if (analytics) {
            stats.totalCost = analytics.reduce((sum, a) => sum + (a.total_cost || 0), 0)
          }
        }

        setUserStats(stats)
      }
    } catch (error) {
      console.error('Error fetching user data:', error)
    } finally {
      setIsLoadingData(false)
    }
  }

  const calculateAvgSuccessRate = (batches: any[]) => {
    const completedBatches = batches.filter(b => b.status === 'completed')
    if (completedBatches.length === 0) return 0

    const totalSuccessRate = completedBatches.reduce((sum, b) => {
      const total = (b.successful_runs || 0) + (b.failed_runs || 0)
      if (total === 0) return sum
      return sum + ((b.successful_runs || 0) / total) * 100
    }, 0)

    return Math.round(totalSuccessRate / completedBatches.length)
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setRecentBatches([])
    setUserStats(null)
  }

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffHours < 1) return 'Just now'
    if (diffHours === 1) return '1 hour ago'
    if (diffHours < 24) return `${diffHours} hours ago`
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays} days ago`
    return date.toLocaleDateString()
  }

  const getStatusBadge = (status: string) => {
    const styles = {
      completed: 'bg-success-100 dark:bg-success-950/30 text-success-800 dark:text-success-100',
      processing: 'bg-primary-100 dark:bg-primary-950/30 text-primary-800 dark:text-primary-100',
      failed: 'bg-error-100 dark:bg-error-950/30 text-error-800 dark:text-error-100',
      pending: 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-100',
    }

    const icons = {
      completed: '✓',
      processing: '⏳',
      failed: '✗',
      pending: '○',
    }

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status as keyof typeof styles] || styles.pending}`}>
        {icons[status as keyof typeof icons] || icons.pending} {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    )
  }

  // Loading state
  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 dark:border-primary-500 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    )
  }

  // Logged-out view
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        {/* Header */}
        <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <div className="max-w-7xl mx-auto px-4 py-6">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              LLM Document Analysis
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Internal Consultant Tool for Batch Document Processing
            </p>
          </div>
        </header>

        {/* Hero Section */}
        <main className="max-w-7xl mx-auto px-4 py-16">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-4">
              Streamline Document Extraction<br />for Customer Projects
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto mb-8">
              Extract structured data from multiple documents using AI-powered LLM models with comprehensive analytics.
              Perfect for consultants working on data extraction projects.
            </p>
            <div className="flex gap-4 justify-center">
              <Link
                href="/auth/login"
                className="inline-block px-8 py-3 bg-primary-600 dark:bg-primary-500 text-white rounded-lg hover:bg-primary-700 dark:hover:bg-primary-600 transition-colors font-semibold shadow-sm"
              >
                Sign In →
              </Link>
              <a
                href="#features"
                className="inline-block px-8 py-3 border-2 border-primary-600 dark:border-primary-500 text-primary-600 dark:text-primary-400 rounded-lg hover:bg-primary-50 dark:hover:bg-primary-950/30 transition-colors font-semibold"
              >
                Learn More ↓
              </a>
            </div>
          </div>

          {/* Feature Cards */}
          <div id="features" className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 shadow-sm">
              <div className="w-12 h-12 bg-primary-100 dark:bg-primary-950/30 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-primary-600 dark:text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                Batch Processing
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Process 1-N documents in parallel with multiple LLM models. Real-time progress tracking with comprehensive results.
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 shadow-sm">
              <div className="w-12 h-12 bg-primary-100 dark:bg-primary-950/30 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-primary-600 dark:text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                Multi-Model Comparison
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Test 20+ AI models simultaneously. Compare success rates, costs, and execution times to find the best fit.
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 shadow-sm">
              <div className="w-12 h-12 bg-primary-100 dark:bg-primary-950/30 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-primary-600 dark:text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                Comprehensive Analytics
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Detailed validation results, attribute-level failure tracking, and AI-generated pattern insights for optimization.
              </p>
            </div>
          </div>

          {/* Use Case Example */}
          <div className="bg-primary-50/50 dark:bg-primary-950/30 border border-primary-200 dark:border-primary-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-primary-900 dark:text-primary-100 mb-2">
              Real-World Example
            </h3>
            <p className="text-primary-700 dark:text-primary-300">
              "Process 10 Swedish railway contracts to extract parties, dates, and amounts. Compare 3 different models to identify which performs best for Nordic documents, with detailed analytics showing which extraction fields are most problematic."
            </p>
          </div>
        </main>
      </div>
    )
  }

  // Logged-in view
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                LLM Document Analysis
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">v3.3 - Universal Document Extraction</p>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600 dark:text-gray-400">{user.email}</span>
              <button
                onClick={handleSignOut}
                className="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-800 dark:hover:text-primary-300 transition-colors"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Quick Actions */}
        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* New Batch Job Card */}
            <Link
              href="/dashboard"
              className="block bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border-2 border-primary-600 dark:border-primary-500 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-primary-600 dark:bg-primary-500 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">
                    New Batch Job
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                    Start processing documents with multiple AI models
                  </p>
                  <div className="inline-flex items-center text-primary-600 dark:text-primary-400 font-medium text-sm">
                    Go to Dashboard →
                  </div>
                </div>
              </div>
            </Link>

            {/* Batch History Card */}
            <Link
              href="/batches"
              className="block bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-700 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">
                    View Batch History
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                    Browse {userStats?.totalBatches || 0} previous batch{userStats?.totalBatches !== 1 ? 'es' : ''}
                  </p>
                  <div className="inline-flex items-center text-primary-600 dark:text-primary-400 font-medium text-sm">
                    View History →
                  </div>
                </div>
              </div>
            </Link>
          </div>
        </section>

        {/* Recent Activity */}
        {recentBatches.length > 0 && (
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Recent Activity</h2>
            <div className="space-y-4">
              {recentBatches.map((batch) => {
                const successRate = batch.successful_runs + batch.failed_runs > 0
                  ? Math.round((batch.successful_runs / (batch.successful_runs + batch.failed_runs)) * 100)
                  : 0

                return (
                  <div
                    key={batch.id}
                    className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 border border-gray-200 dark:border-gray-700"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                          {batch.name}
                        </h3>
                        {getStatusBadge(batch.status)}
                      </div>
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {formatTimeAgo(batch.created_at)}
                      </span>
                    </div>
                    <div className="flex items-center gap-6 text-sm text-gray-600 dark:text-gray-400 mb-3">
                      <span>{batch.total_documents} document{batch.total_documents !== 1 ? 's' : ''}</span>
                      {batch.status === 'completed' && (
                        <span className="text-success-600 dark:text-success-500 font-medium">
                          Success: {successRate}%
                        </span>
                      )}
                    </div>
                    <div className="flex gap-3">
                      <Link
                        href={`/batches/${batch.id}`}
                        className="px-4 py-1.5 text-sm bg-primary-600 dark:bg-primary-500 text-white rounded hover:bg-primary-700 dark:hover:bg-primary-600 transition-colors"
                      >
                        View Results
                      </Link>
                      <Link
                        href={`/dashboard?cloneFrom=${batch.id}`}
                        className="px-4 py-1.5 text-sm border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                      >
                        Clone Settings
                      </Link>
                    </div>
                  </div>
                )
              })}
            </div>
            <div className="mt-4 text-center">
              <Link
                href="/batches"
                className="inline-flex items-center text-primary-600 dark:text-primary-400 hover:text-primary-800 dark:hover:text-primary-300 font-medium text-sm"
              >
                View All Batches →
              </Link>
            </div>
          </section>
        )}

        {/* Quick Stats */}
        {userStats && (
          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Quick Stats</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 border border-gray-200 dark:border-gray-700 text-center">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Batches</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{userStats.totalBatches}</p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 border border-gray-200 dark:border-gray-700 text-center">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Docs Processed</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{userStats.totalDocuments}</p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 border border-gray-200 dark:border-gray-700 text-center">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Avg Success</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{userStats.avgSuccessRate}%</p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 border border-gray-200 dark:border-gray-700 text-center">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Cost</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">${userStats.totalCost.toFixed(2)}</p>
              </div>
            </div>
          </section>
        )}

        {/* Empty State for New Users */}
        {!isLoadingData && recentBatches.length === 0 && (
          <section className="text-center py-12">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-8 border border-gray-200 dark:border-gray-700">
              <div className="w-16 h-16 bg-primary-100 dark:bg-primary-950/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-primary-600 dark:text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                Welcome to LLM Document Analysis
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
                You haven't created any batch jobs yet. Get started by uploading documents and configuring your first extraction.
              </p>
              <Link
                href="/dashboard"
                className="inline-block px-8 py-3 bg-primary-600 dark:bg-primary-500 text-white rounded-lg hover:bg-primary-700 dark:hover:bg-primary-600 transition-colors font-semibold shadow-sm"
              >
                Create Your First Batch →
              </Link>
            </div>
          </section>
        )}
      </main>
    </div>
  )
}
