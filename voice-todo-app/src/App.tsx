
import React from 'react';
import VoiceToDoApp from './components/VoiceToDoApp';

const App: React.FC = () => {
    return (
        <div className="min-h-screen bg-gray-50 py-8">
            <div className="container mx-auto px-4">
                <VoiceToDoApp />
            </div>
        </div>
    );
}

export default App;