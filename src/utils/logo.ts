import chalk from 'chalk';

/**
 * Mujarrad CLI Brand Logo
 *
 * Brand Color: #7B37BA (Purple)
 * Style: 3D Text, Italic Bold, Opaque
 */

const BRAND_COLOR = '#7B37BA';

export const logo = `
${chalk.hex(BRAND_COLOR).bold(`
   ███╗   ███╗██╗   ██╗     ██╗ █████╗ ██████╗ ██████╗  █████╗ ██████╗
   ████╗ ████║██║   ██║     ██║██╔══██╗██╔══██╗██╔══██╗██╔══██╗██╔══██╗
   ██╔████╔██║██║   ██║     ██║███████║██████╔╝██████╔╝███████║██║  ██║
   ██║╚██╔╝██║██║   ██║██   ██║██╔══██║██╔══██╗██╔══██╗██╔══██║██║  ██║
   ██║ ╚═╝ ██║╚██████╔╝╚█████╔╝██║  ██║██║  ██║██║  ██║██║  ██║██████╔╝
   ╚═╝     ╚═╝ ╚═════╝  ╚════╝ ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═╝╚═════╝
`)}${chalk.hex(BRAND_COLOR).dim(`
   ╔═════════════════════════════════════════════════════════════════╗
   ║  ULTIMATE ABSTRACTION APPLICATION - ORCHSTRATION TECHNOLOGY OS  ║
   ╚═════════════════════════════════════════════════════════════════╝
`)}
`;

export const logoSimple = chalk.hex(BRAND_COLOR).bold.italic('𝗠𝗨𝗝𝗔𝗥𝗥𝗔𝗗');

export const version = chalk.hex(BRAND_COLOR).dim('v1.0.0');

export function displayBanner(): void {
  console.log(logo);
  console.log(chalk.hex(BRAND_COLOR)(`  ${version}\n`));
}

export function displaySimple(): void {
  console.log(`${logoSimple} ${version}`);
}
