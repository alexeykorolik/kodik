import {useRef,useState} from 'react';
import {api,type Row,type State} from './api';
import {useMaterialDraft} from './useMaterialDraft';
import {WorkspaceView,type WorkspaceModel} from './Workspace';
export function TaskPreview({task:original,state,refresh,onBack,onPublish}:{task:Row;state:State;refresh:()=>Promise<void>;onBack:()=>void;onPublish:()=>void}){
  const author=useMaterialDraft(original,state.user as {id:string;org_id:string},original.id),task=author.task;
  const [code,setCode]=useState(task.preview_solution||task.starter),[inputs,setInputs]=useState(''),[result,setResult]=useState<Row|null>(null),[attempts,setAttempts]=useState<Row[]>([]),[busy,setBusy]=useState(false),[error,setError]=useState(''),[tab,setTab]=useState('task'),[pane,setPane]=useState(35),[fontSize,setFontSize]=useState(16);
  const revision=useRef(0);
  const change=(value:string)=>{setCode(value);revision.current++;author.change('preview_solution',value)};
  const persist=async()=>{try{await author.persist();return true}catch(e){setError((e as Error).message);return false}};
  async function run(check:boolean){setBusy(true);setError('');setResult(null);try{
    if(!await persist())return;
    const response=check?await api('/preview',{task,code}):await api('/preview/run',{code,inputs:inputs===''?[]:inputs.split('\n')});
    setResult(response);
    if(check)setAttempts(items=>[{id:crypto.randomUUID(),status:response.status,result:response,feedback:'',created_at:new Date().toISOString()},...items]);
  }catch(e){setError((e as Error).message)}finally{setBusy(false)}}
  const visible={...task,examples:task.tests.filter((t:Row)=>!t.hidden).map((t:Row)=>({inputs:t.inputs,expected:t.expected})),group_title:'Пробное прохождение'};
  const model:WorkspaceModel={task:visible,attempts,studentDraft:{change,error:author.error,conflict:null,resolve:async()=>{}},code,persist,saved:author.status==='saved'?'Пример сохранён отдельно от стартового кода':author.status==='saving'?'Сохраняем пример…':'Пример сохранён на компьютере',revision,refresh,onBack,nextTask:{title:'Публикация задания'},onNext:onPublish,backLabel:'← К конструктору задания',readOnly:false,lessonContext:undefined,onLessonOverview:undefined,inputs,setInputs,result,busy,error,tab,setTab,pane,setPane,fontSize,setFontSize,submission:{submit:async()=>{},cancel:async()=>{},phase:'idle',busy:false,label:'',error:'',canCancel:false},run,previewMode:true,checkLabel:'Проверить пример решения',nextLabel:'К публикации',referenceAction:()=>change(task.reference_solution||'')};
  return <WorkspaceView model={model}/>;
}
