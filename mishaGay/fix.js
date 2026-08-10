const fs = require('fs');
const glob = require('glob');

const files = glob.sync('src/**/*.{ts,tsx}');

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let original = content;

    // Fix selectedTool state
    content = content.replace(/useState<string \| null>\(null\)/g, match => {
        if (content.includes('selectedTool')) return 'useState<number | null>(null)';
        return match;
    });
    content = content.replace(/const \[selectedTool, setSelectedTool\] = useState<string \| "">("");/g, 'const [selectedTool, setSelectedTool] = useState<number | null>(null);');
    content = content.replace(/const \[selectedTool, setSelectedTool\] = useState<string \| null>\(null\);/g, 'const [selectedTool, setSelectedTool] = useState<number | null>(null);');

    // Fix createContract payloads in ClientCard, CreateExcelContractInline, CreateRentalInline, CreateRentalContractPage
    content = content.replace(/toolId: selectedTool/g, 'toolId: selectedTool as number');
    // Or just let TS infer if selectedTool is number
    // Wait, if selectedTool is number | null, we might need selectedTool!
    content = content.replace(/toolId: selectedTool(!?)/g, 'toolId: selectedTool!');

    // Fix other components that take toolId as string
    // ContractsTable.tsx: getHistoryContractsTable takes string? 
    // In ContractsTable, we need to see what is string.

    if (content !== original) {
        fs.writeFileSync(file, content);
        console.log('Fixed', file);
    }
});
