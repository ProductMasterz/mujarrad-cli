import chalk from 'chalk';

/**
 * Mujarrad CLI Brand Logo
 *
 * Brand Colors: Two-color linear gradient
 * - Deep Cerulean Blue: #0A3D62 (depth, intellect, digital realm)
 * - Light Silver-Gray: #D3D3D3 (clarity, simplicity, refined abstraction)
 * Style: Minimalist, sleek, modern with geometric layered icon
 */

const COLOR_DEEP_BLUE = '#0A3D62';
const COLOR_SILVER_GRAY = '#D3D3D3';

// Abstract geometric icon representing layers/connections
const geometricIcon = `
${chalk.hex(COLOR_DEEP_BLUE)('    ╔═══╗')}
${chalk.hex('#1A4D72')('    ║')}${chalk.hex(COLOR_SILVER_GRAY)('▓▓▓')}${chalk.hex('#1A4D72')('║     ╔═══╗')}
${chalk.hex('#2A5D82')('    ║')}${chalk.hex('#C3C3C3')('▓▓▓')}${chalk.hex('#2A5D82')('║═════╣')}${chalk.hex(COLOR_SILVER_GRAY)('▓▓▓')}${chalk.hex('#2A5D82')('║')}
${chalk.hex('#3A6D92')('    ╚═══╝     ║')}${chalk.hex('#B3B3B3')('▓▓▓')}${chalk.hex('#3A6D92')('║═══╗')}
${chalk.hex('#4A7DA2')('              ╚═══╝   ║')}
${chalk.hex('#5A8DB2')('                      ║')}
${chalk.hex(COLOR_SILVER_GRAY)('                      ╚═══╝')}
`;

// Main logo with gradient effect on text
export const logo = `
${geometricIcon}

${chalk.hex(COLOR_DEEP_BLUE).bold('   ███╗   ███╗')}${chalk.hex('#1A4D72').bold('██╗   ██╗')}${chalk.hex('#2A5D82').bold('     ██╗')}${chalk.hex('#3A6D92').bold(' █████╗')}${chalk.hex('#4A7DA2').bold(' ██████╗')}${chalk.hex('#5A8DB2').bold(' ██████╗')}${chalk.hex('#6A9DC2').bold('  █████╗')}${chalk.hex(COLOR_SILVER_GRAY).bold(' ██████╗')}
${chalk.hex(COLOR_DEEP_BLUE).bold('   ████╗ ████║')}${chalk.hex('#1A4D72').bold('██║   ██║')}${chalk.hex('#2A5D82').bold('     ██║')}${chalk.hex('#3A6D92').bold('██╔══██╗')}${chalk.hex('#4A7DA2').bold('██╔══██╗')}${chalk.hex('#5A8DB2').bold('██╔══██╗')}${chalk.hex('#6A9DC2').bold('██╔══██╗')}${chalk.hex(COLOR_SILVER_GRAY).bold('██╔══██╗')}
${chalk.hex('#1A4D72').bold('   ██╔████╔██║')}${chalk.hex('#2A5D82').bold('██║   ██║')}${chalk.hex('#3A6D92').bold('     ██║')}${chalk.hex('#4A7DA2').bold('███████║')}${chalk.hex('#5A8DB2').bold('██████╔╝')}${chalk.hex('#6A9DC2').bold('██████╔╝')}${chalk.hex('#7AADD2').bold('███████║')}${chalk.hex(COLOR_SILVER_GRAY).bold('██║  ██║')}
${chalk.hex('#2A5D82').bold('   ██║╚██╔╝██║')}${chalk.hex('#3A6D92').bold('██║   ██║')}${chalk.hex('#4A7DA2').bold('██   ██║')}${chalk.hex('#5A8DB2').bold('██╔══██║')}${chalk.hex('#6A9DC2').bold('██╔══██╗')}${chalk.hex('#7AADD2').bold('██╔══██╗')}${chalk.hex('#8ABDE2').bold('██╔══██║')}${chalk.hex(COLOR_SILVER_GRAY).bold('██║  ██║')}
${chalk.hex('#3A6D92').bold('   ██║ ╚═╝ ██║')}${chalk.hex('#4A7DA2').bold('╚██████╔╝')}${chalk.hex('#5A8DB2').bold('╚█████╔╝')}${chalk.hex('#6A9DC2').bold('██║  ██║')}${chalk.hex('#7AADD2').bold('██║  ██║')}${chalk.hex('#8ABDE2').bold('██║  ██║')}${chalk.hex('#9ACDF2').bold('██║  ██║')}${chalk.hex(COLOR_SILVER_GRAY).bold('██████╔╝')}
${chalk.hex('#4A7DA2').bold('   ╚═╝     ╚═╝')}${chalk.hex('#5A8DB2').bold(' ╚═════╝')}${chalk.hex('#6A9DC2').bold('  ╚════╝')}${chalk.hex('#7AADD2').bold(' ╚═╝  ╚═╝')}${chalk.hex('#8ABDE2').bold('╚═╝  ╚═╝')}${chalk.hex('#9ACDF2').bold('╚═╝  ╚═╝')}${chalk.hex('#AADDF2').bold('╚═╝  ╚═╝')}${chalk.hex(COLOR_SILVER_GRAY).bold('╚═════╝')}

${chalk.hex('#5A8DB2')('   ╔═══════════════════════════════════════════════════════════════════╗')}
${chalk.hex('#6A9DC2')('   ║')}${chalk.hex('#7AADD2')('                          DATA UNLOCKD                             ')}${chalk.hex('#8ABDE2')('║')}
${chalk.hex(COLOR_SILVER_GRAY)('   ╚═══════════════════════════════════════════════════════════════════╝')}
`;

export const logoSimple = chalk.hex(COLOR_DEEP_BLUE).bold('M') +
                          chalk.hex('#2A5D82').bold('U') +
                          chalk.hex('#4A7DA2').bold('J') +
                          chalk.hex('#6A9DC2').bold('A') +
                          chalk.hex('#8ABDE2').bold('R') +
                          chalk.hex('#AADDF2').bold('R') +
                          chalk.hex('#CADDF2').bold('A') +
                          chalk.hex(COLOR_SILVER_GRAY).bold('D');

export const version = chalk.hex('#5A8DB2')('v1.0.0');

export function displayBanner(): void {
  console.log(logo);
  console.log(chalk.hex('#5A8DB2')(`  ${version}\n`));
}

export function displaySimple(): void {
  console.log(`${logoSimple} ${version}`);
}
