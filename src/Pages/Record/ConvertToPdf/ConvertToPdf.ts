import { noteEvent } from "../../../Utils/TypesForMidi";
import Bass_png from '../../../Assets/bass.png';
import Violin_png from '../../../Assets/violin.png';

interface AddOptions{
    width?:number,
    height?:number,
    /** Percent in number 0-20 */padding_vertical?:number,
    /** Percent in number 0-20 */padding_horizontal?:number
}

interface Options{
    width:number,
    height:number,
    padding_vertical:number,
    padding_horizontal:number
}



const Positions = [7+9,16+9,28+9,37+9,49+9,58+9,70+9,79+9]; //10
const Bar_Width = 40;
const Drawing_Start_Position = 12;

/**
 * Converts Midi to PDF
 */
export default class ConvertToPDF{
    private File:Array<noteEvent>
    private ctx: CanvasRenderingContext2D
    private options:Options
    private bassKey:any
    private violinKey:any
    private subbDelta:number
    private BarsData:{
        violin:{data:Array<null | number>,current:number,lastDelta:number},
        bass:{data:Array<null | number>,current:number,lastDelta:number}}
    constructor(File:Array<noteEvent>, ctx:CanvasRenderingContext2D, options?:AddOptions){
        this.File = File;
        this.ctx = ctx;
        this.options = {
            width: options?.width ? options.width : 595,
            height: options?.height ? options.height: 842,
            padding_horizontal: options?.padding_horizontal ? options.padding_horizontal: 5,
            padding_vertical: options?.padding_vertical ? options.padding_vertical : 5
        }
        this.BarsData = {
            violin:{
                data:this.renderEmptyBarArray(32),
                current:0,
                lastDelta:0
            },
            bass:{
                data:this.renderEmptyBarArray(32),
                current:0,
                lastDelta:0
            }
        };
        this.subbDelta = 0;
        this.bassKey = null;
        this.violinKey  = null;
        //bpm  1 beat is equal to 500 ms, so 120bpm = 1 minute //1 bar is 2 seconds, so 2/32 = 31.25 ms every digit, 16th note is 62.5 milisec
        this.load_images = this.load_images.bind(this);
        this.draw_Lines = this.draw_Lines.bind(this);
        this.Draw = this.Draw.bind(this);
        this.resetBarsData = this.resetBarsData.bind(this);
        this.load_images();
    }

    //Public Functions

    public Draw():void{
        this.ctx.fillStyle = '#FFF';
        this.ctx.beginPath();
        this.ctx.fillRect(0,0,this.options.width,this.options.height);
        for(let x = 0; x < 8; x++){
            this.draw_Lines(x);
        }
        this.ctx.beginPath();
        //Drawing 4|4 and Title
        this.ctx.fillStyle = '#000'
        this.ctx.font = 'bold 20px sans-serif';
        this.ctx.fillText('4',this.calculate_percent(Drawing_Start_Position - 1.5,'vertical'),this.calculate_percent(Positions[0] + 1.8,'horizontal'));
        this.ctx.fillText('4',this.calculate_percent(Drawing_Start_Position - 1.5,'vertical'),this.calculate_percent(Positions[0] + 4,'horizontal'));
        this.ctx.fillText('4',this.calculate_percent(Drawing_Start_Position - 1.5,'vertical'),this.calculate_percent(Positions[1] + 1.8,'horizontal'));
        this.ctx.fillText('4',this.calculate_percent(Drawing_Start_Position - 1.5,'vertical'),this.calculate_percent(Positions[1] + 4,'horizontal'));
        this.ctx.font = 'bold 24px serif';
        this.ctx.fillText('Sheet Music',this.calculate_percent(40,'vertical'),this.calculate_percent(5,'horizontal'));
        this.ctx.font = 'normal 16px serif';
        this.ctx.fillText('bpm=60',this.calculate_percent(10,'vertical'),this.calculate_percent(8,'horizontal'));
        //Reading File and Drawing Notes
        this.resetBarsData();
        if(this.File){
            if(this.File[0]){
                this.subbDelta = this.File[0].Delta;
                this.File.map(event =>{
                    const delta = Math.floor((event.Delta - this.subbDelta)/1000);
                    const duration = Math.floor(Math.floor(event.Duration / 1000) / 32.25);
                    const noteData = this.Calculate_note_number_and_hash(event.NoteNumber);
                    const type = duration >= 32 ? 32 : duration >=16 ? 16 : duration >= 8 ? 8 : duration >= 4 ? 4 : 2;
                    this.drawNote(noteData.SheetMusicNumber,delta,noteData.hash,type);
                    return null;
                })
            }
        }
    }

    public static async DrawEmptySheet(ctx:CanvasRenderingContext2D, options?:AddOptions) {
        const Finaloptions = {
            width: options?.width ? options.width : 595,
            height: options?.height ? options.height: 842,
            padding_horizontal: options?.padding_horizontal ? options.padding_horizontal: 5,
            padding_vertical: options?.padding_vertical ? options.padding_vertical : 5
        }
        const calculate_percent = (percent:number,orientation:'horizontal' | 'vertical'):number => {
            if(orientation === 'horizontal'){
                return Finaloptions.height / (100 / percent);
            }
            if(orientation === 'vertical'){
                return Finaloptions.width / (100 / percent);
            }
            return 0;
        }
        //Images
        const AddImage = (type:'bass' | 'violin'):Promise<any> =>{
            return new Promise(resolve =>{
                const img = new Image();
                img.onload = () => {resolve(img)}
                img.src = type === 'bass' ? Bass_png : Violin_png;
            })
        }
        const bass =  await AddImage('bass');
        const violin = await AddImage('violin');

        const draw_Lines = (pos:number):void => {
            const pos_x = calculate_percent(2,'vertical');
            const width = calculate_percent(96,'vertical');
            ctx.beginPath();
            //Drawing Keys 
            pos % 2 === 0 && ctx.drawImage(violin,pos_x - 5,calculate_percent(Positions[pos] -1.5 ,'horizontal'),50,60);
            pos % 2 === 1 && ctx.drawImage(bass,pos_x + 10,calculate_percent(Positions[pos],'horizontal'),26,26);
            //Drawing Break Lines
            ctx.lineWidth = 2;
            ctx.strokeStyle = 'rgba(0,0,0,0.5)';
            ctx.moveTo(pos_x + 45,calculate_percent(Positions[pos] - 0.5,'horizontal'));
            ctx.lineTo(pos_x + 45, calculate_percent(Positions[pos] + 4.5,'horizontal'));
            ctx.stroke();
            ctx.closePath();
            //Draw Bars
            ctx.beginPath();
            const bar_one_pos_x = calculate_percent(Drawing_Start_Position + Bar_Width,'vertical')
            ctx.moveTo(bar_one_pos_x,calculate_percent(Positions[pos] - 0.5,'horizontal'));
            ctx.lineTo(bar_one_pos_x,calculate_percent(Positions[pos] + 4.5,'horizontal'));
            const bar_two_pos_x = calculate_percent(Drawing_Start_Position + (25.3 * 2) * 100 /25 * Bar_Width / 100,'vertical');
            ctx.moveTo(bar_two_pos_x,calculate_percent(Positions[pos] - 0.5,'horizontal'));
            ctx.lineTo(bar_two_pos_x,calculate_percent(Positions[pos] + 4.5,'horizontal'));
            ctx.stroke();
            
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.strokeStyle = '#000';
            for(let x = 0; x < 5; x++){
                const pos_y = calculate_percent(Positions[pos] + x,'horizontal');
                ctx.moveTo(pos_x,pos_y);
                ctx.lineTo(pos_x + width,pos_y);
            }
            ctx.stroke();
        }



        //Drawing
        ctx.fillStyle = '#FFF';
        ctx.beginPath();
        ctx.fillRect(0,0,Finaloptions.width,Finaloptions.height);
        for(let x = 0; x < 8; x++){
            draw_Lines(x);
        }
        ctx.beginPath();
        //Drawing 4|4 and Title
        ctx.fillStyle = '#000'
        ctx.font = 'bold 20px sans-serif';
        ctx.fillText('4',calculate_percent(Drawing_Start_Position - 1.5,'vertical'),calculate_percent(Positions[0] + 1.8,'horizontal'));
        ctx.fillText('4',calculate_percent(Drawing_Start_Position - 1.5,'vertical'),calculate_percent(Positions[0] + 4,'horizontal'));
        ctx.fillText('4',calculate_percent(Drawing_Start_Position - 1.5,'vertical'),calculate_percent(Positions[1] + 1.8,'horizontal'));
        ctx.fillText('4',calculate_percent(Drawing_Start_Position - 1.5,'vertical'),calculate_percent(Positions[1] + 4,'horizontal'));
        ctx.font = 'bold 24px serif';
        ctx.fillText('Sheet Music',calculate_percent(40,'vertical'),calculate_percent(5,'horizontal'));
        ctx.font = 'normal 16px serif';
        ctx.fillText('bpm=60',calculate_percent(10,'vertical'),calculate_percent(8,'horizontal'));
    }

    //Private Functions

    private drawNote(noteNumber:number,/** miliseconds */ delta:number,hash:boolean,type:number ):void{
        if(noteNumber < 45){
            const decimNumber = 21 - noteNumber;
            const interval = delta - this.BarsData.bass.lastDelta;
            const note_place = Math.floor(interval / (2000/32));
            console.log(note_place + '....' + delta + '...' + this.BarsData.bass.lastDelta);
            this.BarsData.bass.lastDelta = delta;
            this.BarsData.bass.current += Math.floor(interval / (2000/32));
            const how_many_bars = (Math.floor(this.BarsData.bass.current / 64));
            const final_note_position = this.BarsData.bass.current - 64*how_many_bars;
            const vertial_position = this.calculate_percent(Drawing_Start_Position + (Bar_Width / 32 * final_note_position),'vertical');
            const horizontal_position = this.calculate_percent(Positions[(how_many_bars*2) + 1],'horizontal') + this.calculate_percent(11 + (decimNumber) / 2,'horizontal');
            //1 bar is 2 seconds, it devides to 32 place, so one place is 2000/32

            //TODO ~~~ note_place should define type, add notes with dots

            //
            let pos_x = vertial_position;
            const notePosition = horizontal_position; 
            if(decimNumber > -13){
                for(let x = decimNumber +1; x > -13; x--){
                    if(x%2 === -1){
                    const linePos = this.calculate_percent(Positions[horizontal_position + 1],'horizontal') + this.calculate_percent(10.5 + x / 2,'horizontal');
                    this.Canvas_Draw_Note_Line(pos_x,linePos);
                    }
                }
            }
            if(noteNumber  === 45){
                    const linePos = this.calculate_percent(Positions[horizontal_position + 1],'horizontal') + this.calculate_percent(-1,'horizontal');
                    this.Canvas_Draw_Note_Line(pos_x,linePos);
            }
            if(type === 8 || type === 4 || type === 2 || type === 16 || type ===32){
                hash && this.draw_hash(pos_x - 1,notePosition);
                this.Canvas_Draw_Note(pos_x,notePosition,type);
            }
        }
        if(noteNumber >= 45){
            //72 -- mid c5
            const decimNumber = 45 - noteNumber;
            const interval = delta - this.BarsData.violin.lastDelta;
            const note_place = Math.floor(interval / (2000/32));
            console.log(note_place + '....' + delta + '...' + this.BarsData.violin.lastDelta);
            this.BarsData.violin.lastDelta = delta;
            this.BarsData.violin.current += Math.floor(interval / (2000/32));
            const how_many_bars = (Math.floor(this.BarsData.violin.current / 64));
            const final_note_position = this.BarsData.violin.current - 64*how_many_bars;
            const vertial_position = this.calculate_percent(Drawing_Start_Position + (Bar_Width / 32 * final_note_position),'vertical');
            const horizontal_position = this.calculate_percent(Positions[(how_many_bars*2)],'horizontal') + this.calculate_percent(5 + (decimNumber) / 2,'horizontal');
            let pos_x = vertial_position;
            const notePosition = horizontal_position;
            //
            if(decimNumber > -1){
                for(let x = decimNumber; x > -2; x--){
                    if(x%2 === -1){
                    const linePos = this.calculate_percent(Positions[horizontal_position],'horizontal') + this.calculate_percent(5.5 + x / 2,'horizontal');
                    this.Canvas_Draw_Note_Line(pos_x,linePos);
                    }
                }
            }
            if(decimNumber < -13){
                for(let x = decimNumber; x < -12; x++){
                    if(x%2 === -1){
                    const linePos = this.calculate_percent(Positions[horizontal_position],'horizontal') + this.calculate_percent(5.5 + x / 2,'horizontal');
                    this.Canvas_Draw_Note_Line(pos_x,linePos);
                    }
                }
            }
            if(type === 8 || type === 4 || type === 2 || type === 16 || type ===32){
                hash && this.draw_hash(pos_x - 1,notePosition);
                this.Canvas_Draw_Note(pos_x,notePosition,type);
            }
        }
    }



    //Drawing Functions

    private Calculate_note_number_and_hash(noteNumber:number):{SheetMusicNumber:number,hash:boolean}{
        //24 ,36 ,48,60,72,84,96
        let hash = false;
        let finalNumber = 0;
        const selector = noteNumber - 24;
        if(noteNumber - 24 >= 0){
            if((selector - 12 * (Math.floor(selector / 12))) % 12 === 0){
                //C
                finalNumber = 24 + 7 * (Math.floor(selector / 12));
            }else if((selector - 12 * (Math.floor(selector / 12))) % 11 === 0){
                // H | B
                finalNumber = 30 + 7 * (Math.floor(selector / 12));
            }else if((selector - 12 * (Math.floor(selector / 12))) % 10 === 0){
                //A#
                finalNumber = 29 + 7 * (Math.floor(selector / 12));
                hash = true;
            }else if((selector - 12 * (Math.floor(selector / 12))) % 9 === 0 ){
                // A
                finalNumber = 29 + 7 * (Math.floor(selector / 12));
            }else if((selector - 12 * (Math.floor(selector / 12))) % 8 === 0){
                //G#
                finalNumber = 28 + 7 * (Math.floor(selector / 12));
                hash = true;
            }else if((selector - 12 * (Math.floor(selector / 12))) % 7 === 0){
                // G
                finalNumber = 28 + 7 * (Math.floor(selector / 12));
            }else if((selector - 12 * (Math.floor(selector / 12))) % 6 === 0){
                //F#
                finalNumber = 27 + 7 * (Math.floor(selector / 12));
                hash = true;
            }else if((selector - 12 * (Math.floor(selector / 12))) % 5 === 0){
                // F
                finalNumber = 27 + 7 * (Math.floor(selector / 12));
            }else if((selector - 12 * (Math.floor(selector / 12))) % 4 === 0){
                // E
                finalNumber = 26 + 7 * (Math.floor(selector / 12));
            }else if((selector - 12 * (Math.floor(selector / 12))) % 3 === 0){
                //D#
                finalNumber = 25 + 7 * (Math.floor(selector / 12));
                hash = true;
            }else if((selector - 12 * (Math.floor(selector / 12))) % 2 === 0){
                // D
                finalNumber = 25 + 7 * (Math.floor(selector / 12));
            }else{
                // C#
                finalNumber = 24 + 7 * (Math.floor(selector / 12));
                hash = true;
            }
        }else{
            if(noteNumber === 23){
                finalNumber = 23;
            }
            if(noteNumber === 22){
                finalNumber = 22 
                hash = true
            }
            if(noteNumber === 21){
                finalNumber = 22
            }
        }
        return{
            SheetMusicNumber: finalNumber,
            hash:hash
        }
    }

    private Canvas_Draw_Note_Line(x:number,y:number):void{
        this.ctx.strokeStyle = '#000';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.moveTo(x + 2,y);
        this.ctx.lineTo(x+18,y);
        this.ctx.stroke();
        this.ctx.closePath();
    }

    private Canvas_Draw_Note(x:number,y:number,which:8|4|2|16|32):void{
        this.ctx.fillStyle = '#000';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.arc(x + 10,y,5,0,Math.PI * 2);
        if(which === 16 || which ===32){
            this.ctx.stroke();
        }else{
            this.ctx.fill();
        }
        if(which !== 32){
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        this.ctx.moveTo(x + 15,y + 3);
        this.ctx.lineTo(x + 15,y - 30);
        this.ctx.stroke();
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        if(which === 4 || which === 2){
            this.ctx.moveTo(x + 15,y + -29);
            this.ctx.lineTo(x + 25,y - 24);
        if(which === 2){
            this.ctx.moveTo(x + 15,y - 24);
            this.ctx.lineTo(x + 25,y - 19);
        }
        }
        this.ctx.stroke();
        }
    }

    private draw_hash(pos_x:number,pos_y:number):void{
        this.ctx.lineWidth = 1;
        this.ctx.strokeStyle = '#000';
        this.ctx.beginPath();
        this.ctx.moveTo(pos_x + 2,pos_y-5);
        this.ctx.lineTo(pos_x,pos_y + 5);
        this.ctx.moveTo(pos_x + 4,pos_y-5);
        this.ctx.lineTo(pos_x + 2,pos_y + 5);
        this.ctx.stroke();
        this.ctx.closePath();
    }

    private draw_Lines(pos:number):void{
        const pos_x = this.calculate_percent(2,'vertical');
        const width = this.calculate_percent(96,'vertical');
        this.ctx.beginPath();
        //Drawing Keys
        pos % 2 === 0 && this.ctx.drawImage(this.violinKey,pos_x - 5,this.calculate_percent(Positions[pos] -1.5 ,'horizontal'),50,60);
        pos % 2 === 1 && this.ctx.drawImage(this.bassKey,pos_x + 10,this.calculate_percent(Positions[pos],'horizontal'),26,26);
        //Drawing Break Lines
        this.ctx.lineWidth = 2;
        this.ctx.strokeStyle = 'rgba(0,0,0,0.5)';
        this.ctx.moveTo(pos_x + 45,this.calculate_percent(Positions[pos] - 0.5,'horizontal'));
        this.ctx.lineTo(pos_x + 45, this.calculate_percent(Positions[pos] + 4.5,'horizontal'));
        this.ctx.stroke();
        this.ctx.closePath();
        //Draw Bars
        this.ctx.beginPath();
        const bar_one_pos_x = this.calculate_percent(Drawing_Start_Position + Bar_Width,'vertical')
        this.ctx.moveTo(bar_one_pos_x,this.calculate_percent(Positions[pos] - 0.5,'horizontal'));
        this.ctx.lineTo(bar_one_pos_x,this.calculate_percent(Positions[pos] + 4.5,'horizontal'));
        const bar_two_pos_x = this.calculate_percent(Drawing_Start_Position + (25.3 * 2) * 100 /25 * Bar_Width / 100,'vertical');
        this.ctx.moveTo(bar_two_pos_x,this.calculate_percent(Positions[pos] - 0.5,'horizontal'));
        this.ctx.lineTo(bar_two_pos_x,this.calculate_percent(Positions[pos] + 4.5,'horizontal'));
        this.ctx.stroke();
        
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        this.ctx.strokeStyle = '#000';
        for(let x = 0; x < 5; x++){
            const pos_y = this.calculate_percent(Positions[pos] + x,'horizontal');
            this.ctx.moveTo(pos_x,pos_y);
            this.ctx.lineTo(pos_x + width,pos_y);
        }
        this.ctx.stroke();
    }
    
    private renderEmptyBarArray(length:number):Array<null>{
        let toReturnArray:Array<null> = [];
        for(let x = 0; x < length; x++){
            toReturnArray.push(null);
        }
        return toReturnArray;
    }

    private calculate_percent(percent:number,orientation:'horizontal' | 'vertical'):number{
        if(orientation === 'horizontal'){
            return this.options.height / (100 / percent);
        }
        if(orientation === 'vertical'){
            return this.options.width / (100 / percent);
        }
        return 0;
    }

    private load_images():void{
        const load_image = () =>{
            this.bassKey = bass;
            this.violinKey = violin;
            this.Draw();
        }
        const bass = new Image();
        const violin = new Image();
        bass.onload = function(){
            load_image();
        }
        bass.src = Bass_png;
        violin.onload = function(){
            load_image();
        }
        violin.src = Violin_png;
    }

    private resetBarsData():void{
        this.BarsData.violin.current = 0;
        this.BarsData.violin.lastDelta = 0;
        this.BarsData.violin.data = this.renderEmptyBarArray(32);
        this.BarsData.bass.current = 0;
        this.BarsData.bass.lastDelta = 0;
        this.BarsData.bass.data = this.renderEmptyBarArray(32);
    }


}