import React,{useRef,ChangeEvent, useState,useEffect} from 'react';
import { useHistory } from 'react-router-dom';
import './Main.styles.scss';

import InputFile from '../../Components/Inputfile/InputFile';
import NewOptions from '../../Components/NewOptions/Options';
import { Options as OptionsType } from '../../Utils/TypesForOptions';
import { checkExtension, SaveAsBase64 } from '../../Utils/smallFunctions';
import { DefaultOptions } from '../../Utils/Default';
import optionsSwitch from '../../Utils/handleOptionsChange'
import DonationPrompt from '../../Components/DonationPrompt/DonationPrompt';


import Logo from '../../Assets/piano_icon.png';
import Midi from '../../Assets/demo.MID';

export default function Main() {

    const MidiFileRef = useRef<HTMLInputElement>(null);
    const [windowHeight,setWindowHeight] = useState<number>(window.innerHeight);
    const [options,setOptions] = useState<OptionsType>(DefaultOptions);
    const [isConfiguring,setIsConfiguring] = useState<boolean>(false);
    const history = useHistory();


    const handleFileInput = () =>{
        if(checkExtension(MidiFileRef.current?.files![0],'mid')){
            SaveAsBase64(MidiFileRef.current?.files![0],'file').then(e =>{
                localStorage.setItem('options',JSON.stringify(options));
                history.push('/Play');
            });
        }else{
            alert('Error, Submited file is not MIDI file...');
        }
    }

    const handleOptionsChange = (event:ChangeEvent<HTMLInputElement> | {target:{name:string,value:any}}) =>{
        let currentOptions = optionsSwitch(event,options);
        console.log('changing options');
        try{
            localStorage.setItem('options',JSON.stringify(currentOptions));
            setOptions(currentOptions);
        }catch{
            alert('this File is probably to big man');
        }
    }

    const reloadOptions = ():void =>{
        const opt = localStorage.getItem('options');
        opt && setOptions(JSON.parse(opt));
    }

    useEffect(()=>{
        document.addEventListener('resize',()=>{setWindowHeight(window.innerHeight)});
        window.addEventListener('resize',()=>{setWindowHeight(window.innerHeight)});
        // eslint-disable-next-line react-hooks/exhaustive-deps
    },[]);

    const PlayDemoMidi = async () =>{
        localStorage.setItem('options',JSON.stringify(options));
        await fetch(Midi).then(r => r.blob()).then(r =>{
            SaveAsBase64(r,'file').then(e =>{
                history.push('/Play');
            });
            
        })
    }

    const onConfClick = ():void =>{
        setTimeout(()=>{
            setIsConfiguring(true);
        },500);
    }

    return (
        <div style={{height:windowHeight}} className='mainDiv'>
            <DonationPrompt />
            <div className='mainHead'>
                <InputFile FileRef={MidiFileRef} onFileUpload={handleFileInput} onConfClick={onConfClick} options={options} isConfOn={isConfiguring}/>
                <div className='Main_data'>
                    <img src={Logo} className='Logo' alt='Logo' />
                    <h1 className='Main_data_Text Title'>Web midi player/visualizer/recorder for piano</h1>
                    <h3 className='Main_data_Text Description'>
                    React Piano by Chris - chriswang315@gmail.com for more information.
                    Thank you. 
                    <br /><br />
                </div>
            </div>
            <button className='Demo_Bt' onClick={PlayDemoMidi}>Play demo song</button>
            <NewOptions isOpened={isConfiguring} handleOptionsChange={handleOptionsChange} reloadOptions={reloadOptions} options={options} onGoBack={()=>{setIsConfiguring(false)}} />
        </div>
    )
}
