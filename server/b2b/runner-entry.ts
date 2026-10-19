import { runPythonAst } from "../../src/pythonExecution";
import { parseCourseProgram } from "../../src/pythonRuntime";
import { structureError } from "../../src/pythonStructure";
import { learningRules } from "../../src/b2b/learningRules";
let input = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => {
  input += chunk;
  if (input.length > 100000) process.exit(2);
});
process.stdin.on("end", () => {
  try {
    const { code, inputs, rules = [] } = JSON.parse(input);
    // Only a fixed public vocabulary reaches the structural checker.
    if(!Array.isArray(rules)||rules.some(id=>!learningRules.some(rule=>rule.id===id)))process.exit(2);
    let result, learningError;
    try {
      const program = parseCourseProgram(code);
      result = runPythonAst(program, inputs);
      if(!result.error){
        for(const id of rules){
          if(structureError(program,result,[id])){learningError=learningRules.find(rule=>rule.id===id)!.hint;break;}
        }
      }
    } catch(error){result={output:[],error:error instanceof Error?error.message:'Проверь запись Python.',operations:0};}
    process.stdout.write(
      JSON.stringify({
        output: result.output,
        error: result.error,
        operations: result.operations,
        learning_error: learningError,
      }),
    );
  } catch {
    process.exit(2);
  }
});
