import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Check, Trash, Square, Edit } from 'lucide-react';

import { SpeechRecognition, SpeechRecognitionErrorEvent, SpeechRecognitionEvent } from "../types/speech-recognition";

// Import type declarations to ensure TypeScript recognizes the Web Speech API
import '../types/speech-recognition.d';

// Define our interfaces
interface Task {
    id: number;
    content: string;
    completed: boolean;
}

const VoiceToDoApp: React.FC = () => {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [listening, setListening] = useState<boolean>(false);
    const [transcript, setTranscript] = useState<string>('');
    const [editedTranscript, setEditedTranscript] = useState<string>('');
    const [feedback, setFeedback] = useState<string>('');
    const [processingCommand, setProcessingCommand] = useState<boolean>(false);
    const [isEditing, setIsEditing] = useState<boolean>(false);

    // Using any here because TypeScript doesn't have built-in types for Web Speech API
    const recognitionRef = useRef<SpeechRecognition | null>(null);

    useEffect(() => {
        // Initialize speech recognition
        if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            if (SpeechRecognition) {
                recognitionRef.current = new SpeechRecognition();
                recognitionRef.current.continuous = true;
                recognitionRef.current.interimResults = true;
                recognitionRef.current.lang = 'en-US'; // Set language to English

                recognitionRef.current.onresult = (event: SpeechRecognitionEvent) => {
                    // Clear previous results before setting new ones
                    const currentTranscript = Array.from(event.results)
                        .map(result => result[0].transcript)
                        .join('');

                    // Only set transcripts if we're actually recognizing new speech
                    if (currentTranscript.trim()) {
                        setTranscript(currentTranscript);
                        setEditedTranscript(currentTranscript);
                        setProcessingCommand(true);
                    }
                };

                recognitionRef.current.onerror = (event: SpeechRecognitionErrorEvent) => {
                    console.error('Speech recognition error', event.error);
                    setFeedback(`Error: ${event.error}`);
                    setProcessingCommand(false);
                    clearInputs();
                };

                recognitionRef.current.onend = () => {
                    if (listening) {
                        // If we're supposed to be listening but recognition ended, restart it
                        try {
                            recognitionRef.current?.start();
                        } catch (error) {
                            console.error('Error restarting speech recognition:', error);
                            setListening(false);
                            setFeedback('Speech recognition stopped unexpectedly');
                        }
                    }
                };

                // Add onstart handler to clear previous inputs
                recognitionRef.current.onstart = () => {
                    clearInputs();
                    setFeedback('Listening... (Language: English)');
                };
            }
        } else {
            setFeedback('Speech recognition not supported in this browser');
        }

        return () => {
            if (recognitionRef.current) {
                recognitionRef.current.stop();
            }
        };
    }, [listening]);

    // Helper function to clear input fields
    const clearInputs = (): void => {
        setTranscript('');
        setEditedTranscript('');
        setIsEditing(false);
        setProcessingCommand(false);
    };

    const toggleListening = (): void => {
        if (!recognitionRef.current) {
            setFeedback('Speech recognition not initialized');
            return;
        }

        if (listening) {
            recognitionRef.current.stop();
            setListening(false);
            setFeedback('Listening stopped');
            clearInputs();
        } else {
            try {
                // Clear inputs before starting new listening session
                clearInputs();
                recognitionRef.current.start();
                setListening(true);
            } catch (error) {
                console.error('Speech recognition error:', error);
                setFeedback(`Couldn't start listening: ${error instanceof Error ? error.message : String(error)}`);
            }
        }
    };

    const toggleEditing = (): void => {
        setIsEditing(!isEditing);
    };

    const handleTranscriptChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
        setEditedTranscript(e.target.value);
    };

    const finishCurrentCommand = (): void => {
        if (processingCommand && editedTranscript.trim()) {
            processVoiceCommand(editedTranscript);
            // Make sure to clear inputs immediately after processing
            clearInputs();
            setFeedback('Command processed');
        } else {
            setFeedback('No command to process');
        }
    };

    const cancelCurrentCommand = (): void => {
        clearInputs();
        setFeedback('Command cancelled');
    };

    const processVoiceCommand = (command: string): void => {
        // Convert to lowercase for easier matching
        const lowerCommand = command.toLowerCase();

        // Add a task
        if (lowerCommand.includes('add task')) {
            const taskContent = lowerCommand.replace('add task', '').trim();
            if (taskContent) {
                addTask(taskContent);
                setFeedback(`Added task: "${taskContent}"`);
            }
        }
        // Mark task as done
        else if (lowerCommand.includes('mark') && lowerCommand.includes('as done')) {
            const taskToMark = lowerCommand.replace('mark', '').replace('as done', '').trim();
            markTaskAsDone(taskToMark);
        }
        // Delete task
        else if (lowerCommand.includes('delete task')) {
            const taskToDelete = lowerCommand.replace('delete task', '').trim();
            deleteTask(taskToDelete);
        }
        // Clear all tasks
        else if (lowerCommand.includes('clear all tasks')) {
            setTasks([]);
            setFeedback('All tasks cleared');
        } else {
            setFeedback(`Didn't recognize command: "${command}"`);
        }
    };

    const addTask = (content: string): void => {
        setTasks(prevTasks => [
            ...prevTasks,
            { id: Date.now(), content, completed: false }
        ]);
    };

    const markTaskAsDone = (taskContent: string): void => {
        let found = false;
        setTasks(prevTasks =>
            prevTasks.map(task => {
                if (task.content.toLowerCase().includes(taskContent.toLowerCase())) {
                    found = true;
                    return { ...task, completed: true };
                }
                return task;
            })
        );

        if (found) {
            setFeedback(`Marked tasks containing "${taskContent}" as done`);
        } else {
            setFeedback(`No tasks found matching "${taskContent}"`);
        }
    };

    const deleteTask = (taskContent: string): void => {
        const initialLength = tasks.length;
        setTasks(prevTasks =>
            prevTasks.filter(task => {
                return !task.content.toLowerCase().includes(taskContent.toLowerCase());
            })
        );

        if (tasks.length !== initialLength) {
            setFeedback(`Deleted task containing "${taskContent}"`);
        } else {
            setFeedback(`No task found matching "${taskContent}"`);
        }
    };

    const handleManualDelete = (id: number): void => {
        setTasks(prevTasks => prevTasks.filter(task => task.id !== id));
    };

    const handleManualToggle = (id: number): void => {
        setTasks(prevTasks =>
            prevTasks.map(task =>
                task.id === id ? { ...task, completed: !task.completed } : task
            )
        );
    };

    return (
        <div className="flex flex-col items-center p-4 max-w-md mx-auto">
            <h1 className="text-2xl font-bold mb-6">Voice-Controlled To-Do App</h1>

            <div className="w-full mb-6 p-4 bg-gray-100 rounded-lg">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold">Voice Commands (English)</h2>
                    <div className="flex space-x-2">
                        <button
                            onClick={toggleListening}
                            className={`p-2 rounded-full ${listening ? 'bg-red-500 text-white' : 'bg-blue-500 text-white'}`}
                            title={listening ? "Stop listening" : "Start listening"}
                        >
                            {listening ? <MicOff size={24} /> : <Mic size={24} />}
                        </button>
                        {processingCommand && (
                            <button
                                onClick={toggleEditing}
                                className={`p-2 rounded-full ${isEditing ? 'bg-yellow-500 text-white' : 'bg-gray-300 text-gray-600'}`}
                                title="Edit recognized text"
                            >
                                <Edit size={24} />
                            </button>
                        )}
                        <button
                            onClick={finishCurrentCommand}
                            className={`p-2 rounded-full ${processingCommand ? 'bg-green-500 text-white' : 'bg-gray-300 text-gray-600'}`}
                            disabled={!processingCommand}
                            title="Process current command"
                        >
                            <Square size={24} />
                        </button>
                    </div>
                </div>

                <div className="mb-4">
                    <p className="text-sm text-gray-600 mb-1">Try saying:</p>
                    <ul className="text-sm text-gray-800 space-y-1">
                        <li>"Add task buy groceries"</li>
                        <li>"Mark buy groceries as done"</li>
                        <li>"Delete task buy groceries"</li>
                        <li>"Clear all tasks"</li>
                    </ul>
                </div>

                <div className="mt-3">
                    <p className="text-sm font-medium">Status: <span className="text-blue-600">{feedback}</span></p>
                    {transcript && (
                        <div className="text-sm mt-2 bg-white p-2 rounded border border-gray-200">
                            <p className="font-medium">Heard: </p>
                            {isEditing ? (
                                <div className="my-2">
                                    <input
                                        type="text"
                                        value={editedTranscript}
                                        onChange={handleTranscriptChange}
                                        className="w-full p-2 border border-gray-300 rounded text-sm"
                                        aria-label="Edit recognized text"
                                    />
                                    <p className="text-xs text-gray-500 mt-1">Edit the text above if the recognition wasn't accurate</p>
                                </div>
                            ) : (
                                <p className="italic">{transcript}</p>
                            )}
                            <div className="flex space-x-2 mt-2">
                                <button
                                    onClick={toggleEditing}
                                    className="bg-yellow-500 text-white px-3 py-1 rounded text-sm"
                                >
                                    {isEditing ? "Done Editing" : "Edit Text"}
                                </button>
                                <button
                                    onClick={finishCurrentCommand}
                                    className="bg-green-500 text-white px-3 py-1 rounded text-sm"
                                >
                                    Process Command
                                </button>
                                <button
                                    onClick={cancelCurrentCommand}
                                    className="bg-red-500 text-white px-3 py-1 rounded text-sm"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="w-full">
                <h2 className="text-xl font-semibold mb-4">Tasks ({tasks.length})</h2>

                {tasks.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">No tasks yet. Try adding one using your voice!</p>
                ) : (
                    <ul className="space-y-2">
                        {tasks.map(task => (
                            <li
                                key={task.id}
                                className={`flex items-center justify-between p-3 rounded border ${task.completed ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200'}`}
                            >
                                <div className="flex items-center">
                                    <button
                                        onClick={() => handleManualToggle(task.id)}
                                        className={`p-1 rounded-full mr-3 ${task.completed ? 'bg-green-500 text-white' : 'bg-gray-200'}`}
                                    >
                                        <Check size={16} />
                                    </button>
                                    <span className={task.completed ? 'line-through text-gray-500' : ''}>
                                        {task.content}
                                    </span>
                                </div>
                                <button
                                    onClick={() => handleManualDelete(task.id)}
                                    className="text-red-500 hover:text-red-700"
                                >
                                    <Trash size={16} />
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
};

export default VoiceToDoApp;