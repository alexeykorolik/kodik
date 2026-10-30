import { runPythonAst } from "../../src/pythonExecution";
import { parseCourseProgram } from "../../src/pythonRuntime";
import { structureError } from "../../src/pythonStructure";
import { learningRules } from "../../src/b2b/learningRules";
import { translateWorkspace, TRANSLATOR_VERSION } from "../../src/adaptive/blockProgram";
import { checkScene, SCENE_CHECKS } from "../../src/python/sceneCheck";
let input = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => {
  input += chunk;
  if (input.length > 100000) process.exit(2);
});
process.stdin.on("end", () => {
  try {
    const request = JSON.parse(input);
    // Trusted translation of an untrusted block workspace happens here, inside the same
    // restricted process that executes untrusted code, never in the API process.
    if (request.action === "translate") {
      const { workspace, palette } = request;
      if (!Array.isArray(palette) || palette.some((t: unknown) => typeof t !== "string")) process.exit(2);
      const t = translateWorkspace(workspace, { allowed: palette });
      process.stdout.write(JSON.stringify({ ok: t.ok, python: t.python, errors: t.errors.slice(0, 10), warnings: t.warnings.slice(0, 10), translator: TRANSLATOR_VERSION, block_types: t.blockTypes }));
      return;
    }
    const { code, inputs, rules = [], world, checks = [], reference } = request;
    // Only a fixed public vocabulary reaches the structural checker.
    if(!Array.isArray(rules)||rules.some(id=>!learningRules.some(rule=>rule.id===id)))process.exit(2);
    if(world!==undefined&&typeof world!=='string')process.exit(2);
    if(!Array.isArray(checks)||checks.some(c=>!(SCENE_CHECKS as readonly string[]).includes(c))||reference!==undefined&&typeof reference!=='string')process.exit(2);
    let result, learningError, sceneCheck, expectedScene;
    try {
      const program = parseCourseProgram(code);
      result = runPythonAst(program, inputs, { world });
      if(!result.error){
        for(const id of rules){
          if(structureError(program,result,[id])){learningError=learningRules.find(rule=>rule.id===id)!.hint;break;}
        }
      }
    } catch(error){result={output:[],error:error instanceof Error?error.message:'Проверь запись Python.',operations:0};}
    // Scene checks compare with the teacher's reference run on the same input and field (trusted code).
    if(!result.error&&checks.some(c=>c!=='output')){
      let expected;
      if(checks.some(c=>c==='drawing'||c==='plot')){
        if(!reference)sceneCheck={passed:false,message:'Для проверки рисунка или графика у задания нет эталона.',infrastructure:true};
        else{try{expected=runPythonAst(parseCourseProgram(reference),inputs,{world})}catch(error){expected={error:error instanceof Error?error.message:'ошибка записи'}}if(expected.error)sceneCheck={passed:false,message:'Эталон задания завершился с ошибкой: '+expected.error,infrastructure:true};}
      }
      if(!sceneCheck)sceneCheck=checkScene(checks,result.scene,expected?.scene);
      if(expected?.scene&&!sceneCheck.passed)expectedScene=expected.scene;
    }
    process.stdout.write(
      JSON.stringify({
        output: result.output,
        error: result.error,
        operations: result.operations,
        learning_error: learningError,
        ...(result.scene ? { scene: result.scene } : {}),
        ...(result.outputTimes ? { output_times: result.outputTimes } : {}),
        ...(sceneCheck ? { scene_check: sceneCheck } : {}),
        ...(expectedScene ? { expected_scene: expectedScene } : {}),
      }),
    );
  } catch {
    process.exit(2);
  }
});
