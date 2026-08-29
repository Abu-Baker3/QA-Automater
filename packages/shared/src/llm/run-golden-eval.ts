import { GoldenEvalHarness } from './golden-eval-harness';

async function main() {
  console.log('================================================================');
  console.log('  QA AUTOMATER — AI EVAL HARNESS (GOLDEN STORIES GATE E14.4)');
  console.log('================================================================\n');

  try {
    const summary = await GoldenEvalHarness.runEvaluation(undefined, {
      min_locator_precision: 0.8,
    });

    console.log(`Eval Run ID:        ${summary.eval_run_id}`);
    console.log(`Evaluated Repos:    ${summary.total_repos}`);
    console.log(`Evaluated Stories:  ${summary.total_stories}`);
    console.log(`Total Steps:        ${summary.total_steps}`);
    console.log(`Correct Mappings:   ${summary.correct_mappings}`);
    console.log(`Overall Precision:  ${(summary.locator_precision * 100).toFixed(2)}%`);
    console.log(`Min Threshold Gate: ${(summary.min_precision_threshold * 100).toFixed(2)}%\n`);

    console.log('--- REPOSITORY BREAKDOWN ---');
    for (const repo of summary.repo_breakdown) {
      console.log(
        `  • ${repo.repo_name.padEnd(25)} : ${repo.correct_mappings}/${repo.total_steps} steps (${(repo.precision * 100).toFixed(2)}%)`,
      );
    }

    console.log('\n================================================================');
    console.log('  RESULT: QUALITY GATE PASSED — CI DEPLOYMENT ALLOWED ✅');
    console.log('================================================================\n');
    process.exit(0);
  } catch (err) {
    console.error('\n================================================================');
    console.error('  RESULT: QUALITY GATE FAILED — CI DEPLOYMENT BLOCKED ❌');
    console.error('================================================================');
    if (err instanceof Error) {
      console.error(`Error: ${err.message}`);
    } else {
      console.error(String(err));
    }
    process.exit(1);
  }
}

void main();
