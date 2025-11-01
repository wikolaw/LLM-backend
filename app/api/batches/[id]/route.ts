import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'

export const dynamic = 'force-dynamic'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const batchId = params.id

    // Fetch batch job details
    const { data: batch, error: fetchError } = await supabase
      .from('batch_jobs')
      .select(
        `
        id,
        name,
        status,
        created_at,
        updated_at,
        total_documents,
        completed_documents,
        successful_runs,
        failed_runs,
        models_used,
        system_prompt,
        user_prompt,
        validation_schema
      `
      )
      .eq('id', batchId)
      .eq('user_id', user.id)
      .single()

    if (fetchError || !batch) {
      return NextResponse.json({ error: 'Batch not found' }, { status: 404 })
    }

    return NextResponse.json(batch)
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const batchId = params.id
    console.log(`🗑️ DELETE request for batch: ${batchId}`)

    // First, check if the batch exists and belongs to the user
    const { data: batch, error: fetchError } = await supabase
      .from('batch_jobs')
      .select('id, status, user_id, name')
      .eq('id', batchId)
      .single()

    if (fetchError || !batch) {
      console.log(`❌ Batch not found: ${batchId}`, fetchError)
      return NextResponse.json({ error: 'Batch not found' }, { status: 404 })
    }

    console.log(`✅ Found batch: ${batch.name} (${batchId})`)

    // Verify ownership
    if (batch.user_id !== user.id) {
      console.log(`❌ Unauthorized: batch belongs to ${batch.user_id}, user is ${user.id}`)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Prevent deletion if batch is currently processing
    if (batch.status === 'processing') {
      console.log(`❌ Cannot delete processing batch: ${batchId}`)
      return NextResponse.json(
        { error: 'Cannot delete batch while processing' },
        { status: 400 }
      )
    }

    // Delete the batch (this will cascade to runs and batch_analytics via foreign keys)
    console.log(`🗑️ Attempting to delete batch: ${batchId}`)
    const { error: deleteError } = await supabase
      .from('batch_jobs')
      .delete()
      .eq('id', batchId)

    if (deleteError) {
      console.error('❌ Error deleting batch:', deleteError)
      return NextResponse.json(
        { error: deleteError.message },
        { status: 500 }
      )
    }

    console.log(`✅ Batch deleted successfully: ${batchId}`)

    // Revalidate the batches page and detail page to force fresh data on next visit
    revalidatePath('/batches', 'page')
    revalidatePath(`/batches/${batchId}`, 'page')
    // Also revalidate the layout to clear any layout-level caching
    revalidatePath('/batches', 'layout')

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
