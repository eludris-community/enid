// Connector; basically a small screen to show while connecting to the server
import Chat from './chat';
import { Center, CircularProgress } from '@chakra-ui/react';
import type { Message } from 'eludris-api-types/oprish';
import { IncomingMessage } from 'eludris-api-types/pandemonium';
import { StrictMode, memo, useEffect, useState } from 'react';
import { atom, useRecoilState } from 'recoil';

export const messagesState = atom<Message[]>({
    key: 'messages',
    default: [],
});

function _Connector() {
    const [messages, setMessages] = useRecoilState(messagesState);

    const [ws, setWs] = useState<WebSocket | null>(null);
    const [interval, setIntervalValue] = useState<number | null>(null);
    const [, setWsState] = useState<WebSocket['readyState']>(
        WebSocket.CONNECTING,
    );

    useEffect(() => {
        if (ws !== null) return;
        console.log('Connecting to Gateway');

        const newWs = new WebSocket('wss://ws.eludris.gay');
        newWs.onopen = () => {
            console.log('Connected to Gateway');
            newWs.send(JSON.stringify({ op: 'PING' }));
            setWsState(newWs.readyState);
        };
        newWs.addEventListener('message', (message) => {
            const data: IncomingMessage = JSON.parse(message.data);
            if (typeof data !== 'object' || data.op === 'PONG') {
                return;
            }
            setMessages((messages) =>
                messages.concat(JSON.parse(message.data).d),
            );
        });

        newWs.onclose = (event) => {
            setWsState(newWs.readyState);
            console.log(
                `Gateway closed with code '${event.code}' and reason '${event.reason}'` +
                    '\nReconnecting in one second if this was not intentional',
            );
            setTimeout(() => {
                setWs(null);
            }, 1000);
        };

        newWs.onerror = (error) => {
            console.error(error);
        };
        setWs(newWs);

        const interval = setInterval(() => {
            newWs.send(JSON.stringify({ op: 'PING' }));
        }, 45000);
        setIntervalValue(interval);
    }, [ws, messages, setMessages]);

    useEffect(() => {
        return () => {
            if (
                ws === null ||
                ws.readyState !== WebSocket.OPEN ||
                interval === null
            )
                return;
            ws.close();
            clearInterval(interval);
        };
    }, [ws, interval]);

    if (ws?.readyState !== WebSocket.OPEN) {
        return (
            <Center h="100%">
                <CircularProgress
                    color="purple.500"
                    isIndeterminate
                ></CircularProgress>
            </Center>
        );
    }
    // Strict mode can be safely added here because it will not cause the websocket to be reconnected

    return (
        <StrictMode>
            {' '}
            <Chat ws={ws}></Chat>
        </StrictMode>
    );
}

const Connector = memo(_Connector);
export default Connector;
