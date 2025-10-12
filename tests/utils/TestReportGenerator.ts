/**
 * TestReportGenerator - Generate test reports in JSON and Markdown formats
 *
 * Generates comprehensive test reports for pre-release validation:
 * - Collects test results from Jest
 * - Generates JSON format for machine processing
 * - Generates Markdown format for human review
 * - Includes environment and version information
 *
 * Implements US8: Pre-Release Validation
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { randomUUID } from 'crypto';
import { getVersion } from '../../src/utils/version.js';

export interface TestResult {
  testName: string;
  status: 'PASS' | 'FAIL' | 'SKIP';
  duration: number; // milliseconds
  errorMessage?: string;
  stackTrace?: string;
}

export interface TestReport {
  reportId: string;
  executedAt: string;
  environment: 'staging' | 'production' | 'local';
  results: TestResult[];
  overallStatus: 'PASS' | 'FAIL';
  totalTests: number;
  passedTests: number;
  failedTests: number;
  skippedTests: number;
  duration: number; // milliseconds
  cliVersion: string;
  nodeVersion: string;
  platform: string;
}

export class TestReportGenerator {
  /**
   * Generate test report from Jest results
   *
   * @param results - Array of test results
   * @param outputDir - Directory to write reports (default: tests/reports)
   * @returns Generated test report
   */
  static async generateReport(
    results: TestResult[],
    outputDir: string = 'tests/reports'
  ): Promise<TestReport> {
    // Calculate statistics
    const passedTests = results.filter(r => r.status === 'PASS').length;
    const failedTests = results.filter(r => r.status === 'FAIL').length;
    const skippedTests = results.filter(r => r.status === 'SKIP').length;
    const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);

    // Determine environment
    const apiUrl = process.env.MUJARRAD_API_BASE_URL || '';
    const environment = apiUrl.includes('staging')
      ? 'staging'
      : apiUrl.includes('mujarrad.com')
      ? 'production'
      : 'local';

    // Create report
    const report: TestReport = {
      reportId: randomUUID(),
      executedAt: new Date().toISOString(),
      environment,
      results,
      overallStatus: failedTests === 0 ? 'PASS' : 'FAIL',
      totalTests: results.length,
      passedTests,
      failedTests,
      skippedTests,
      duration: totalDuration,
      cliVersion: getVersion(),
      nodeVersion: process.version,
      platform: process.platform,
    };

    // Ensure output directory exists
    await fs.mkdir(outputDir, { recursive: true });

    // Generate timestamp for filenames
    const timestamp = new Date()
      .toISOString()
      .replace(/:/g, '-')
      .replace(/\..+/, '');

    // Write JSON report
    const jsonPath = path.join(outputDir, `test-report-${timestamp}.json`);
    await fs.writeFile(jsonPath, JSON.stringify(report, null, 2));

    // Write Markdown report
    const mdPath = path.join(outputDir, `test-report-${timestamp}.md`);
    const markdown = this.formatMarkdown(report);
    await fs.writeFile(mdPath, markdown);

    return report;
  }

  /**
   * Format test report as Markdown
   *
   * @param report - Test report
   * @returns Markdown formatted report
   */
  static formatMarkdown(report: TestReport): string {
    const statusEmoji = report.overallStatus === 'PASS' ? '✅' : '❌';
    const passRate = ((report.passedTests / report.totalTests) * 100).toFixed(1);
    const durationSeconds = (report.duration / 1000).toFixed(2);

    let markdown = `# Test Report ${statusEmoji}\n\n`;

    // Summary section
    markdown += `## Summary\n\n`;
    markdown += `- **Status**: ${statusEmoji} ${report.overallStatus}\n`;
    markdown += `- **Pass Rate**: ${passRate}% (${report.passedTests}/${report.totalTests})\n`;
    markdown += `- **Duration**: ${durationSeconds}s\n`;
    markdown += `- **Environment**: ${report.environment}\n`;
    markdown += `- **Executed**: ${new Date(report.executedAt).toLocaleString()}\n`;
    markdown += `- **Report ID**: \`${report.reportId}\`\n`;
    markdown += `\n`;

    // Build information
    markdown += `## Build Information\n\n`;
    markdown += `- **CLI Version**: ${report.cliVersion}\n`;
    markdown += `- **Node.js**: ${report.nodeVersion}\n`;
    markdown += `- **Platform**: ${report.platform}\n`;
    markdown += `\n`;

    // Test statistics
    markdown += `## Test Statistics\n\n`;
    markdown += `| Status | Count | Percentage |\n`;
    markdown += `|--------|-------|------------|\n`;
    markdown += `| ✅ Passed | ${report.passedTests} | ${((report.passedTests / report.totalTests) * 100).toFixed(1)}% |\n`;
    markdown += `| ❌ Failed | ${report.failedTests} | ${((report.failedTests / report.totalTests) * 100).toFixed(1)}% |\n`;
    markdown += `| ⏭️ Skipped | ${report.skippedTests} | ${((report.skippedTests / report.totalTests) * 100).toFixed(1)}% |\n`;
    markdown += `| **Total** | **${report.totalTests}** | **100.0%** |\n`;
    markdown += `\n`;

    // Failed tests details (if any)
    const failedTests = report.results.filter(r => r.status === 'FAIL');
    if (failedTests.length > 0) {
      markdown += `## ❌ Failed Tests\n\n`;

      failedTests.forEach((test, index) => {
        markdown += `### ${index + 1}. ${test.testName}\n\n`;
        markdown += `**Duration**: ${test.duration}ms\n\n`;

        if (test.errorMessage) {
          markdown += `**Error Message**:\n\`\`\`\n${test.errorMessage}\n\`\`\`\n\n`;
        }

        if (test.stackTrace) {
          markdown += `<details>\n<summary>Stack Trace</summary>\n\n\`\`\`\n${test.stackTrace}\n\`\`\`\n</details>\n\n`;
        }
      });
    }

    // Passed tests summary
    if (report.passedTests > 0) {
      markdown += `## ✅ Passed Tests (${report.passedTests})\n\n`;
      markdown += `<details>\n<summary>Show all passed tests</summary>\n\n`;

      const passedTests = report.results.filter(r => r.status === 'PASS');
      passedTests.forEach((test, index) => {
        markdown += `${index + 1}. ${test.testName} (${test.duration}ms)\n`;
      });

      markdown += `\n</details>\n\n`;
    }

    // Skipped tests (if any)
    const skippedTests = report.results.filter(r => r.status === 'SKIP');
    if (skippedTests.length > 0) {
      markdown += `## ⏭️ Skipped Tests (${report.skippedTests})\n\n`;

      skippedTests.forEach((test, index) => {
        markdown += `${index + 1}. ${test.testName}\n`;
      });

      markdown += `\n`;
    }

    // Footer
    markdown += `---\n\n`;
    markdown += `*Generated by Mujarrad CLI Test Report Generator*\n`;
    markdown += `*Report ID: ${report.reportId}*\n`;

    return markdown;
  }

  /**
   * Parse Jest JSON output to TestResult array
   *
   * @param jestOutput - Jest JSON output
   * @returns Array of test results
   */
  static parseJestOutput(jestOutput: any): TestResult[] {
    const results: TestResult[] = [];

    if (!jestOutput.testResults) {
      return results;
    }

    for (const testFile of jestOutput.testResults) {
      for (const testCase of testFile.assertionResults) {
        results.push({
          testName: `${testFile.name.split('/').pop()} › ${testCase.title}`,
          status: testCase.status === 'passed'
            ? 'PASS'
            : testCase.status === 'pending'
            ? 'SKIP'
            : 'FAIL',
          duration: testCase.duration || 0,
          errorMessage: testCase.failureMessages?.join('\n'),
          stackTrace: testCase.failureMessages?.join('\n'),
        });
      }
    }

    return results;
  }

  /**
   * Generate report from Jest JSON output file
   *
   * @param jsonPath - Path to Jest JSON output
   * @param outputDir - Directory to write reports
   * @returns Generated test report
   */
  static async generateReportFromJestJson(
    jsonPath: string,
    outputDir: string = 'tests/reports'
  ): Promise<TestReport> {
    const jestOutput = JSON.parse(await fs.readFile(jsonPath, 'utf-8'));
    const results = this.parseJestOutput(jestOutput);
    return this.generateReport(results, outputDir);
  }
}
