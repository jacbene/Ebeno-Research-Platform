// frontend/src/components/CollaborativeEditor.tsx
// Éditeur de texte collaboratif en temps réel
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  IconButton,
  Tooltip,
  Avatar,
  Badge,
  TextField,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Chip
} from '@mui/material';
import {
  People,
  Comment,
  History,
  Share,
  Send
} from '@mui/icons-material';
import { Editor, EditorState, convertFromRaw } from 'draft-js';
import 'draft-js/dist/Draft.css';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '@/hooks/useAuth';

interface CollaborativeEditorProps {
  sessionId: string;
  documentId?: string;
  projectId: string;
}

export const CollaborativeEditor: React.FC<CollaborativeEditorProps> = ({
  sessionId,
  documentId,
  projectId
}) => {
  const { user } = useAuth();
  const [editorState, setEditorState] = useState(() => EditorState.createEmpty());
  const [socket, setSocket] = useState<Socket | null>(null);
  const [participants, setParticipants] = useState<any[]>([]);
  const [cursors, setCursors] = useState<Record<string, any>>({});
  const [comments] = useState<any[]>([]); // comments is declared but its value is never read, but let's keep it for now as it's part of the UI.
  const [showComments, setShowComments] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [version, setVersion] = useState(1);
  const editorRef = useRef<any>(null);

  // Connexion WebSocket
  useEffect(() => {
    const newSocket = io(process.env.REACT_APP_WS_URL || 'http://localhost:3001', {
      auth: {
        token: localStorage.getItem('token')
      }
    });

    newSocket.on('connect', () => {
      setIsConnected(true);
      
      // Rejoindre la session
      newSocket.emit('joinSession', {
        sessionId,
        userId: user?.id
      });
    });

    newSocket.on('sessionState', (data) => {
      // Charger le contenu initial
      if (data.content) {
        const contentState = convertFromRaw(JSON.parse(data.content));
        setEditorState(EditorState.createWithContent(contentState));
      }
      
      setParticipants(data.participants || []);
      setCursors(data.cursors || {});
      setVersion(data.version || 1);
    });

    newSocket.on('userJoined', (data) => {
      setParticipants(prev => [...prev, data.userId]);
    });

    newSocket.on('userLeft', (data) => {
      setParticipants(prev => prev.filter(p => p !== data.userId));
      setCursors(prev => {
        const newCursors = { ...prev };
        delete newCursors[data.userId];
        return newCursors;
      });
    });

    newSocket.on('documentUpdated', (data) => {
      // Appliquer les opérations reçues
      if (data.updatedBy !== user?.id) {
        applyRemoteOperations(data.operations);
        setVersion(data.version);
      }
    });

    newSocket.on('cursorUpdated', (data) => {
      setCursors(prev => ({
        ...prev,
        [data.userId]: data.position
      }));
    });

    newSocket.on('error', (error) => {
      console.error('Erreur WebSocket:', error);
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [sessionId, user?.id]);

  // Gestion des changements
  const handleEditorChange = (newState: EditorState) => {
    const oldState = editorState;
    
    // Calculer les différences
    const operations = calculateOperations(oldState, newState);
    
    if (operations.length > 0 && socket) {
      // Envoyer les opérations au serveur
      socket.emit('updateDocument', {
        sessionId,
        userId: user?.id,
        operations,
        version
      });
      
      setVersion(prev => prev + 1);
    }
    
    setEditorState(newState);
  };

  // Gestion du curseur
  const handleCursorChange = useCallback(() => {
    if (!socket || !editorRef.current) return;
    
    const selection = editorState.getSelection();
    const position = {
      line: selection.getStartOffset(),
      column: selection.getEndOffset()
    };
    
    socket.emit('cursorMove', {
      sessionId,
      userId: user?.id,
      position
    });
  }, [socket, sessionId, user?.id, editorState]);

  // Ajouter un commentaire
  // const addComment = (text: string) => { // addComment is declared but its value is never read.
  //   if (!socket) return;
    
  //   const selection = editorState.getSelection();
  //   const position = {
  //     start: selection.getStartOffset(),
  //     end: selection.getEndOffset()
  //   };
    
  //   socket.emit('addComment', {
  //     sessionId,
  //     userId: user?.id,
  //     content: text,
  //     position
  //   });
  // };

  // Fonctions utilitaires
  const calculateOperations = (oldState: EditorState, newState: EditorState): any[] => {
    // Implémentation simplifiée d'OT
    // En production, utiliser une bibliothèque comme ot.js
    const oldContent = oldState.getCurrentContent();
    const newContent = newState.getCurrentContent();
    
    const oldText = oldContent.getPlainText();
    const newText = newContent.getPlainText();
    
    // Calculer les différences
    const operations = [];
    
    if (newText !== oldText) {
      // Logique de diff simplifiée
      // Pour une vraie implémentation, utiliser un algorithme de diff
      operations.push({
        type: 'replace',
        position: 0,
        text: newText,
        oldLength: oldText.length
      });
    }
    
    return operations;
  };

  const applyRemoteOperations = (operations: any[]) => {
    let currentContent = editorState.getCurrentContent();
    
    operations.forEach(op => {
      // const blockMap = currentContent.getBlockMap(); // blockMap is declared but its value is never read.
      
      // Appliquer l'opération (simplifié)
      // En production, utiliser une vraie implémentation OT
    });
    
    const newContentState = currentContent;
    const newEditorState = EditorState.createWithContent(newContentState);
    setEditorState(newEditorState);
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Barre d'outils */}
      <Paper sx={{ p: 2, mb: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
        <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center', gap: 2 }}>
          <Badge badgeContent={participants.length} color="primary">
            <People />
          </Badge>
          
          <Typography variant="subtitle1">
            {participants.length} participant(s)
          </Typography>
          
          <Chip 
            label={isConnected ? 'Connecté' : 'Déconnecté'} 
            color={isConnected ? 'success' : 'error'}
            size="small"
          />
          
          <Typography variant="caption" color="textSecondary">
            Version: {version}
          </Typography>
        </Box>
        
        <Box>
          <Tooltip title="Commentaires">
            <IconButton onClick={() => setShowComments(!showComments)}>
              <Comment />
            </IconButton>
          </Tooltip>
          
          <Tooltip title="Historique">
            <IconButton>
              <History />
            </IconButton>
          </Tooltip>
          
          <Tooltip title="Partager">
            <IconButton>
              <Share />
            </IconButton>
          </Tooltip>
        </Box>
      </Paper>

      {/* Zone principale */}
      <Box sx={{ flexGrow: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Éditeur */}
        <Paper sx={{ flexGrow: 1, p: 3, overflow: 'auto', position: 'relative' }}>
          {/* Curseurs des autres utilisateurs */}
          {Object.entries(cursors).map(([userId, position]) => (
            <Box
              key={userId}
              sx={{
                position: 'absolute',
                left: (position.column * 8), // Assuming average character width of 8px
                top: (position.line * 24), // Assuming line height of 24px
                borderLeft: '2px solid blue',
                height: '20px',
                animation: 'blink 1s infinite'
              }}
            >
              <Avatar sx={{ width: 24, height: 24, fontSize: 12 }}>
                {participants.find(p => p.id === userId)?.name?.charAt(0) || 'U'}
              </Avatar>
            </Box>
          ))}
          
          {/* Éditeur */}
          <Box
            sx={{
              minHeight: '500px',
              border: '1px solid #e0e0e0',
              borderRadius: 1,
              p: 2
            }}
            onClick={handleCursorChange}
          >
            <Editor
              ref={editorRef}
              editorState={editorState}
              onChange={handleEditorChange}
              placeholder="Commencez à écrire..."
            />
          </Box>
        </Paper>

        {/* Panneau latéral (commentaires) */}
        {showComments && (
          <Paper sx={{ width: 300, ml: 2, p: 2, display: 'flex', flexDirection: 'column' }}>
            <Typography variant="h6" gutterBottom>
              Commentaires
            </Typography>
            
            <List sx={{ flexGrow: 1, overflow: 'auto' }}>
              {comments.map((comment) => (
                <ListItem key={comment.id} alignItems="flex-start">
                  <ListItemAvatar>
                    <Avatar>{comment.user?.name?.charAt(0) || 'U'}</Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={comment.user?.name}
                    secondary={
                      <>
                        <Typography
                          component="span"
                          variant="body2"
                          color="textPrimary"
                        >
                          {comment.content}
                        </Typography>
                        <br />
                        <Typography variant="caption" color="textSecondary">
                          {new Date(comment.createdAt).toLocaleString()}
                        </Typography>
                      </>
                    }
                  />
                </ListItem>
              ))}
            </List>
            
            <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
              <TextField
                size="small"
                fullWidth
                placeholder="Ajouter un commentaire..."
              />
              <IconButton color="primary">
                <Send />
              </IconButton>
            </Box>
          </Paper>
        )}
      </Box>

      {/* Liste des participants */}
      <Paper sx={{ mt: 2, p: 2 }}>
        <Typography variant="subtitle2" gutterBottom>
          Participants actifs
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          {participants.map((participant) => (
            <Chip
              key={participant.id}
              avatar={<Avatar>{participant.name?.charAt(0)}</Avatar>}
              label={participant.name}
              variant="outlined"
            />
          ))}
        </Box>
      </Paper>
    </Box>
  );
};

// CSS pour l'animation du curseur
const styles = `
  @keyframes blink {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.3; }
  }
`;