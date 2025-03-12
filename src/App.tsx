/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
import React, {
  useCallback,
  useState,
  useRef,
  useEffect,
  useMemo,
} from "react";
import ReactFlow, {
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  Node,
  Edge,
  Connection,
  ReactFlowProvider,
  Handle,
  Position,
} from "reactflow";
import "reactflow/dist/style.css";
import { v4 as uuidv4 } from "uuid";

// Node data interface
interface NodeData {
  isStartNode: unknown;
  text: string;
  choices: Array<{
    id: string;
    text: string;
    function_name?: string | null;
  }>;
  isEnding: boolean;
  function_name: string | null;
  speaker?: string;
  is_me?: boolean;
  onEdit?: (nodeId: string) => void;
  onDelete?: (nodeId: string) => void;
}

// Story node structure for JSON export
interface StoryNode {
  text: string;
  choices: Array<{
    id: string;
    text: string;
    next: string;
    function_name?: string | null;
  }>;
  function_name?: string | null;
  next?: string;
  isEnding: boolean;
  position?: { x: number; y: number };
  speaker?: string | null;
  is_me?: boolean;
}

// Story data structure
interface StoryData {
  nodes: { [key: string]: StoryNode };
  characters: Character[];
}

// Character interface
interface Character {
  id: string;
  name: string;
}

// Add new interfaces
interface CharacterExport {
  characters: Character[];
}

// Custom Node Component
const CustomNode = ({
  data,
  id,
  storyData,
  onNodeContextMenu,
  onPlayNode, // Add this prop
}: {
  data: NodeData;
  id: string;
  storyData: { characters: Character[] };
  onNodeContextMenu: (event: React.MouseEvent, node: Node<NodeData>) => void;
  onPlayNode: (nodeId: string) => void; // Add this type
}) => {
  const getCharacterName = (speakerId: string | null): string => {
    if (!speakerId) return "";
    const character = storyData.characters?.find((c) => c.id === speakerId);
    return character ? character.name : speakerId;
  };

  const replacePlayerName = (text: string): string => {
    // Use regex with global flag to find all matches within curly braces
    let modifiedText = text;
    const matches = text.match(/{([^}]+)}/g);

    if (matches) {
      matches.forEach((match) => {
        // Extract ID without curly braces
        const id = match.slice(1, -1);
        const playerCharacter = storyData.characters?.find((c) => c.id === id);
        modifiedText = modifiedText.replace(
          match,
          playerCharacter?.name || "NULL"
        );
      });
      return modifiedText;
    }
    return text;
  };

  return (
    <div
      className="bg-white p-3 rounded shadow-md border border-gray-300 text-xs min-w-[200px] max-w-[250px]"
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onNodeContextMenu(e, {
          id,
          data,
          position: { x: 0, y: 0 },
          type: "custom",
        });
      }}
      onClick={(e) => e.stopPropagation()} // Add this line
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!bg-gray-400 hover:!bg-blue-500"
        style={{
          width: "8px",
          height: "8px",
        }}
      />

      <div className="flex font-medium mb-2 break-words">
        {getCharacterName(data.speaker!)} : {replacePlayerName(data.text)}
      </div>

      {data.isEnding && (
        <div className="bg-red-100 text-red-800 text-xs px-2 py-0.5 rounded-sm mb-2 inline-block">
          จุดจบ
        </div>
      )}

      {data.choices && data.choices.length > 0 ? (
        <div className="border-t border-gray-200 pt-2 mt-2 min-h-[30px]">
          {data.choices.map((choice, index) => (
            <div key={index} className="relative mb-3 last:mb-0 min-h-[20px]">
              <div className="absolute right-1 top-1 bg-white px-1 text-[10px] z-10">
                {replacePlayerName(choice.text)}
                {choice.function_name && (
                  <span className="text-gray-500 ml-1">
                    ({choice.function_name})
                  </span>
                )}
              </div>
              <Handle
                type="source"
                position={Position.Right}
                id={`choice-${index}`}
                className="!bg-gray-400 hover:!bg-blue-500"
                style={{
                  width: "8px",
                  height: "8px",
                  right: "-4px",
                  zIndex: 5,
                }}
              />
            </div>
          ))}
        </div>
      ) : (
        <>
          <Handle
            type="source"
            position={Position.Right}
            id="default"
            className="!bg-gray-400 hover:!bg-blue-500"
            style={{
              width: "8px",
              height: "8px",
              right: "-4px",
            }}
          />
        </>
      )}

      <div className="flex gap-1 mt-2 justify-end pt-2">
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onPlayNode(id);
          }}
          className="text-xs bg-green-100 hover:bg-green-200 text-green-800 px-2 py-1 rounded"
        >
          ▶️ Start Node
        </button>
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (data.onEdit) {
              data.onEdit(id);
            }
          }}
          className="text-xs bg-blue-100 hover:bg-blue-200 text-blue-800 px-2 py-1 rounded"
        >
          แก้ไข
        </button>
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (data.onDelete) {
              data.onDelete(id);
            }
          }}
          className="text-xs bg-red-100 hover:bg-red-200 text-red-800 px-2 py-1 rounded"
        >
          ลบ
        </button>
      </div>
    </div>
  );
};

// StoryPlayer component for testing the story
const StoryPlayer = ({
  storyData,
  onClose,
  startNodeId,
  onFinish, // Add this prop
}: {
  storyData: StoryData;
  onClose: () => void;
  startNodeId: string;
  onFinish: () => void; // Add this type
}) => {
  const [currentNodeId, setCurrentNodeId] = useState<string>(startNodeId || "");
  const [history, setHistory] = useState<string[]>([startNodeId || ""]);

  const currentNode = storyData.nodes[currentNodeId];

  const handleChoice = (nextNodeId: string) => {
    setCurrentNodeId(nextNodeId);
    setHistory([...history, nextNodeId]);
  };

  const handleBack = () => {
    if (history.length > 1) {
      const newHistory = [...history];
      newHistory.pop();
      setHistory(newHistory);
      setCurrentNodeId(newHistory[newHistory.length - 1]);
    }
  };

  if (!currentNode) {
    return (
      <div className="bg-white p-4 rounded shadow-lg max-w-lg w-full">
        <h3 className="text-red-500 font-bold mb-4">Error: Node not found</h3>
        <button
          onClick={onClose}
          className="bg-red-500 text-white px-3 py-1 rounded text-sm"
        >
          Close
        </button>
      </div>
    );
  }

  const getCharacterName = (speakerId: string | null): string => {
    if (!speakerId) return "";
    // Check in the characters array of storyData
    const character = storyData.characters?.find((c) => c.id === speakerId);
    return character ? character.name : speakerId;
  };

  const replacePlayerName = (text: string): string => {
    // Use regex with global flag to find all matches within curly braces
    let modifiedText = text;
    const matches = text.match(/{([^}]+)}/g);

    if (matches) {
      matches.forEach((match) => {
        // Extract ID without curly braces
        const id = match.slice(1, -1);
        const playerCharacter = storyData.characters?.find((c) => c.id === id);
        modifiedText = modifiedText.replace(
          match,
          playerCharacter?.name || "NULL"
        );
      });
      return modifiedText;
    }
    return text;
  };

  return (
    <div className="bg-white p-4 rounded shadow-lg max-w-lg w-full">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Story Preview</h3>
        <div className="flex gap-2">
          <button
            onClick={handleBack}
            disabled={history.length <= 1}
            className={`px-2 py-1 text-sm rounded ${
              history.length <= 1
                ? "bg-gray-300 text-gray-500"
                : "bg-blue-500 text-white"
            }`}
          >
            ← Back
          </button>
          <button
            onClick={() => {
              onClose();
              onFinish(); // Call onFinish when closing
            }}
            className="bg-red-500 text-white px-2 py-1 text-sm rounded"
          >
            Close
          </button>
        </div>
      </div>

      <div className="mb-6 p-3 bg-gray-100 rounded min-h-20">
        <div>
          {currentNode.speaker && (
            <span
              className={`mb-1 ${
                currentNode.is_me ? "text-blue-600" : "text-gray-600"
              }`}
            >
              {getCharacterName(currentNode.speaker)} :
            </span>
          )}
          <span className="whitespace-pre-wrap">
            {" "}
            {replacePlayerName(currentNode.text)}
          </span>
        </div>
        {currentNode.isEnding && (
          <div className="bg-red-100 text-red-800 text-xs px-2 py-0.5 rounded-sm mt-2 inline-block">
            Ending
          </div>
        )}
      </div>

      <div className="space-y-2">
        {currentNode.choices && currentNode.choices.length > 0 ? (
          currentNode.choices.map((choice, index) => (
            <button
              key={index}
              onClick={() => handleChoice(choice.next)}
              className="w-full text-left p-2 bg-gray-200 hover:bg-gray-300 rounded mb-2 transition-colors"
            >
              {replacePlayerName(choice.text)}
            </button>
          ))
        ) : currentNode.next ? (
          <button
            onClick={() => handleChoice(currentNode.next!)}
            className="w-full text-center p-2 bg-blue-100 hover:bg-blue-200 rounded mb-2 transition-colors"
          >
            Continue
          </button>
        ) : null}
      </div>
    </div>
  );
};

// Move handleNodeContextMenu outside StoryFlow component if possible
const handleNodeContextMenu = (
  event: React.MouseEvent,
  node: Node<NodeData>,
  reactFlowInstance: any
) => {
  event.preventDefault();
  event.stopPropagation();
  const bounds = event.currentTarget.getBoundingClientRect();

  if (reactFlowInstance) {
    const position = reactFlowInstance.screenToFlowPosition({
      x: event.clientX - bounds.left,
      y: event.clientY - bounds.top,
    });

    return {
      x: event.clientX,
      y: event.clientY,
      show: true,
      nodeId: node.id,
      flowPosition: position,
    };
  }
  return null;
};

// Flow component
const StoryFlow = () => {
  const initialNodes: Node<NodeData>[] = [];
  const initialEdges: Edge[] = [];

  const [nodes, setNodes, onNodesChange] =
    useNodesState<NodeData>(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(initialEdges);

  const [newNodeText, setNewNodeText] = useState<string>("");
  const [newNodeChoices, setNewNodeChoices] = useState<
    Array<{
      text: string;
      function_name: string;
    }>
  >([]);
  const [isNodeEnding, setIsNodeEnding] = useState<boolean>(false);
  const [isPopupOpen, setIsPopupOpen] = useState<boolean>(false);
  const [editingNode, setEditingNode] = useState<string | null>(null);
  const [startNodeId, setStartNodeId] = useState<string | null>(null);
  const [nodeFunctionName, setNodeFunctionName] = useState<string>("");
  const [isPlayerOpen, setIsPlayerOpen] = useState<boolean>(false);
  const [storyData, setStoryData] = useState<StoryData | null>(null);
  const [, setMousePosition] = useState({ x: 0, y: 0 });
  const [characters, setCharacters] = useState<Character[]>([]);
  const [newCharacterName, setNewCharacterName] = useState("");
  const [selectedSpeaker, setSelectedSpeaker] = useState<string>("");
  const [isMe, setIsMe] = useState(false);
  const [showCharacterModal, setShowCharacterModal] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const characterFileInputRef = useRef<HTMLInputElement>(null);

  // Add state for editing character
  const [editingCharacter, setEditingCharacter] = useState<string | null>(null);
  const [editedCharacterName, setEditedCharacterName] = useState<string>("");

  // Add new state for character ID
  const [newCharacterId, setNewCharacterId] = useState<string>("");

  // Add edit character function
  const editCharacter = (id: string, name: string) => {
    setEditingCharacter(id);
    setEditedCharacterName(name);
  };

  // Add save character edit function
  const saveCharacterEdit = () => {
    if (editingCharacter && editedCharacterName.trim()) {
      setCharacters(
        characters.map((char) =>
          char.id === editingCharacter
            ? { ...char, name: editedCharacterName.trim() }
            : char
        )
      );
      setEditingCharacter(null);
      setEditedCharacterName("");
    }
  };

  // Fixed: Update nodes when editing
  useEffect(() => {
    if (editingNode) {
      const node = nodes.find((n) => n.id === editingNode);
      if (node) {
        setNewNodeText(node.data.text);
        setNodeFunctionName(node.data.function_name || ""); // เพิ่มบรรทัดนี้
        setNewNodeChoices(
          node.data.choices.map((choice) => ({
            text: choice.text,
            function_name: choice.function_name || "",
          }))
        );
        setIsNodeEnding(node.data.isEnding);
        setSelectedSpeaker(node.data.speaker || "");
        setIsMe(Boolean(node.data.is_me)); // Use Boolean() for explicit conversion
      }
    }
  }, [editingNode, nodes]);

  // Add mouse move effect
  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      setMousePosition({ x: event.clientX, y: event.clientY });
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);

  const openPopup = useCallback(
    (
      nodeId: string | null = null,
      position?: { x: number; y: number },
      copyFrom?: Node<NodeData>
    ) => {
      if (nodeId) {
        setEditingNode(nodeId);
        const node = nodes.find((n) => n.id === nodeId);
        if (node) {
          setNewNodeText(node.data.text);
          setNewNodeChoices(
            node.data.choices.map((choice) => ({
              text: choice.text,
              function_name: choice.function_name || "",
            }))
          );
          setIsNodeEnding(node.data.isEnding);
          setNodeFunctionName(node.data.function_name || "");
          // Make sure to explicitly retrieve these values
          setSelectedSpeaker(node.data.speaker || "");
          setIsMe(Boolean(node.data.is_me)); // Use Boolean() for explicit conversion
          console.log(
            "Editing node with speaker:",
            node.data.speaker,
            "is_me:",
            node.data.is_me
          ); // Debug line
        }
      } else {
        setEditingNode(null);
        if (copyFrom) {
          // Copy data from existing node
          setNewNodeText(copyFrom.data.text);
          setNewNodeChoices(
            copyFrom.data.choices.map((choice) => ({
              text: choice.text,
              function_name: choice.function_name || "",
            }))
          );
          setIsNodeEnding(copyFrom.data.isEnding);
          setNodeFunctionName(copyFrom.data.function_name || "");
          setSelectedSpeaker(copyFrom.data.speaker || "");
          setIsMe(copyFrom.data.is_me || false);
        } else {
          // Reset for new node
          setNewNodeText("");
          setNewNodeChoices([]);
          setIsNodeEnding(false);
          setNodeFunctionName("");
          setSelectedSpeaker("");
          setIsMe(false);
        }

        // If position is provided, store it for the new node
        if (position && reactFlowInstance) {
          const point = reactFlowInstance.project({
            x: position.x,
            y: position.y,
          });
          setMousePosition({ x: point.x, y: point.y });
        }
      }
      setIsPopupOpen(true);
      setContextMenu({ x: 0, y: 0, show: false }); // Hide context menu
    },
    [nodes, reactFlowInstance]
  );

  // Edit existing node
  const editNode = useCallback(
    (nodeId: string) => {
      openPopup(nodeId);
    },
    [openPopup]
  );

  // Delete node
  const deleteNode = useCallback(
    (nodeId: string) => {
      // If deleting start node, update startNodeId
      if (nodeId === startNodeId) {
        setStartNodeId(null);
      }

      setNodes((nds) => nds.filter((node) => node.id !== nodeId));
      setEdges((eds) =>
        eds.filter((edge) => edge.source !== nodeId && edge.target !== nodeId)
      );
    },
    [setEdges, setNodes, startNodeId]
  );

  // Add new character management functions
  const exportCharacters = () => {
    const characterData: CharacterExport = {
      characters: characters,
    };

    const json = JSON.stringify(characterData, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "characters.json";
    link.click();
  };

  const importCharacters = (event: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    const file = event.target.files?.[0];

    if (!file) return;

    fileReader.readAsText(file, "UTF-8");
    fileReader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const jsonData = JSON.parse(content) as CharacterExport;

        if (jsonData.characters) {
          setCharacters(jsonData.characters);
        }
      } catch (error) {
        console.error("Error importing characters:", error);
        alert("ไม่สามารถนำเข้าไฟล์ได้ โปรดตรวจสอบรูปแบบไฟล์");
      }
    };
  };

  // Add new node
  const addNode = useCallback(
    (position?: { x: number; y: number }) => {
      const id = uuidv4();

      const newNode: Node<NodeData> = {
        id,
        type: "custom",
        data: {
          text: "",
          choices: [],
          isEnding: false,
          function_name: "",
          speaker: "",
          is_me: false,
          isStartNode: nodes.length === 0,
          onEdit: (nodeId: string) => editNode(nodeId),
          onDelete: (nodeId: string) => deleteNode(nodeId),
        },
        position: position || { x: 0, y: 0 },
        style: { width: "auto" },
      };

      setNodes((nds) => [...nds, newNode]);

      // If this is the first node, set it as start node
      if (nodes.length === 0) {
        setStartNodeId(id);
      }

      setNewNodeText("");
      setNewNodeChoices([]);
      setIsNodeEnding(false);
      setIsPopupOpen(false);
      setEditingNode(null);
      setNodeFunctionName("");
      setSelectedSpeaker("");
      setIsMe(false);
    },
    [setNodes, nodes.length, editNode, deleteNode]
  );

  // Open popup for editing or adding a new node
  // Update openPopup function to properly set speaker and is_me

  // Connect nodes
  const onConnect = useCallback(
    (connection: Connection) => {
      const sourceNode = nodes.find((n) => n.id === connection.source);
      const targetNode = nodes.find((n) => n.id === connection.target);

      if (sourceNode && targetNode && connection.source && connection.target) {
        let label = "Next";

        if (
          connection.sourceHandle &&
          connection.sourceHandle.startsWith("choice-")
        ) {
          const choiceIndex = parseInt(
            connection.sourceHandle.replace("choice-", "")
          );
          if (sourceNode.data.choices && sourceNode.data.choices[choiceIndex]) {
            label = sourceNode.data.choices[choiceIndex].text;
          }
        }

        const newEdge: Edge = {
          id: uuidv4(),
          source: connection.source,
          target: connection.target,
          sourceHandle: connection.sourceHandle,
          targetHandle: connection.targetHandle,
          type: "smoothstep",
          label,
          focusable: true,
          updatable: true,
          deletable: true,
          selected: false,
          style: { strokeWidth: 1.5 },
          labelStyle: { fontSize: 10 },
          className: "react-flow__edge-interactive",
          data: {
            choiceIndex: connection.sourceHandle
              ? parseInt(connection.sourceHandle.replace("choice-", ""))
              : null,
          },
        };

        setEdges((eds) =>
          eds
            .filter(
              (edge) =>
                !(
                  edge.source === connection.source &&
                  edge.target === connection.target
                ) &&
                !(
                  edge.source === connection.target &&
                  edge.target === connection.source
                )
            )
            .concat([newEdge])
        );
      }
    },
    [setEdges, nodes]
  );

  // Add this inside StoryFlow component, near other edge-related functions
  const onEdgesDelete = useCallback(
    (edgesToDelete: Edge[]) => {
      setEdges((eds) =>
        eds.filter((edge) => !edgesToDelete.some((e) => e.id === edge.id))
      );
    },
    [setEdges]
  );

  const edgeReconnectSuccessful = useRef<boolean>(false);

  const onReconnectStart = useCallback((): void => {
    edgeReconnectSuccessful.current = false;
  }, []);

  // Set a node as the start node
  const setAsStartNode = (nodeId: string) => {
    setStartNodeId(nodeId);
  };

  // Update generateStoryData function
  const generateStoryData = useCallback(
    (tempStartNodeId?: string): StoryData | null => {
      // ตรวจสอบ tempStartNodeId ก่อน ถ้าไม่มีค่อยใช้ startNodeId
      const effectiveStartNodeId = tempStartNodeId || startNodeId;

      if (!effectiveStartNodeId) {
        alert("Please set a start node first!");
        return null;
      }

      // ตรวจสอบว่า node ที่จะใช้เป็น start node มีอยู่จริง
      const startNode = nodes.find((node) => node.id === effectiveStartNodeId);
      if (!startNode) {
        alert("Start node not found!");
        return null;
      }

      const storyData: StoryData = {
        nodes: {},
        characters: characters,
      };

      // First pass: Create all nodes with initialized choices array
      nodes.forEach((node) => {
        const nodeId = node.id;
        storyData.nodes[nodeId] = {
          text: node.data.text || "",
          choices: [],
          isEnding: node.data.isEnding || false,
          position: { x: node.position.x, y: node.position.y },
          function_name: node.data.function_name || null,
          speaker: node.data.speaker || null,
          is_me: node.data.is_me || false,
        };
      });

      // Second pass: Add connections
      nodes.forEach((node) => {
        const nodeId = node.id;
        const outgoingEdges = edges.filter((edge) => edge.source === node.id);
        const currentNode = storyData.nodes[nodeId];

        if (!currentNode) {
          console.error(`Node ${nodeId} not found in storyData`);
          return;
        }

        // If node has choices
        if (
          node.data?.choices &&
          Array.isArray(node.data.choices) &&
          node.data.choices.length > 0
        ) {
          node.data.choices.forEach((choice, index) => {
            const edge = outgoingEdges.find(
              (e) => e.sourceHandle === `choice-${index}`
            );

            currentNode.choices.push({
              text: choice.text || "",
              next: edge ? edge.target : "",
              function_name: choice.function_name || null,
              id: choice.id || uuidv4(),
            });
          });
        }
        // If node has a default connection (no choices)
        else {
          const defaultEdge = outgoingEdges.find(
            (e) => !e.sourceHandle || e.sourceHandle === "default"
          );
          if (defaultEdge) {
            currentNode.next = defaultEdge.target;
          }
        }
      });

      return storyData;
    },
    [characters, edges, nodes, startNodeId]
  );

  // Export as JSON in the required format
  const exportAsJson = () => {
    const storyData = generateStoryData();
    if (!storyData) return;

    const json = JSON.stringify(storyData, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "story.json";
    link.click();
  };

  // Preview story
  const previewStory = () => {
    const data = generateStoryData(); // ไม่ต้องส่ง parameter เมื่อต้องการใช้ startNodeId ปกติ
    if (data) {
      setStoryData(data);
      setIsPlayerOpen(true);
    }
  };

  // Open file dialog for import
  const openImportDialog = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Import JSON
  const importFromJson = (event: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    const file = event.target.files?.[0];

    if (!file) return;

    fileReader.readAsText(file, "UTF-8");
    fileReader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const jsonData = JSON.parse(content);
        let storyData: StoryData;

        // Handle backward compatibility with old format
        if (jsonData.characters) {
          storyData = jsonData as StoryData;
        } else {
          // Convert old format to new format
          const nodes = { ...jsonData };
          delete nodes.characters;
          storyData = {
            nodes: nodes,
            characters: jsonData.characters || [],
          };
        }

        // Import characters if they exist
        if (storyData.characters) {
          setCharacters(storyData.characters);
        }

        // Reset current flow
        setNodes([]);
        setEdges([]);

        const newNodes: Node<NodeData>[] = [];
        const newEdges: Edge[] = [];
        const nodeIdMap: { [key: string]: string } = {};

        // Variables for managing spacing
        let xOffset = 100; // Horizontal offset for nodes
        let yOffset = 100; // Vertical offset for nodes
        const nodeSpacing = 300; // Spacing between nodes

        // First pass: Create all nodes
        Object.entries(storyData.nodes).forEach(([key, data]) => {
          const id = key; // ใช้ key เดิมแทนการสร้าง UUID ใหม่
          nodeIdMap[key] = id;

          // Set start node
          if (key === startNodeId) {
            setStartNodeId(id);
          }

          // Update the nodes creation part in importFromJson function
          newNodes.push({
            id,
            type: "custom",
            data: {
              text: data.text,
              choices: data.choices.map((choice) => ({
                text: choice.text,
                function_name: choice.function_name,
                id,
              })),
              function_name: data.function_name || null,
              isEnding: data.isEnding || false,
              speaker: data.speaker || "", // Make sure this is correctly set
              is_me: Boolean(data.is_me), // Use Boolean() to ensure it's a boolean value
              onEdit: (nodeId: string) => editNode(nodeId),
              onDelete: (nodeId: string) => deleteNode(nodeId),
              isStartNode: undefined,
            },
            position: data.position || {
              x: xOffset,
              y: yOffset,
            },
            style: { width: "auto" },
          });

          // Only update offset if we're using default positioning
          if (!data.position) {
            yOffset += nodeSpacing;
            if (yOffset > 600) {
              yOffset = 100;
              xOffset += nodeSpacing;
            }
          }
        });

        // Second pass: Create all edges
        Object.entries(storyData.nodes).forEach(([srcKey, data]) => {
          const sourceId = nodeIdMap[srcKey];

          // Handle choices connections
          if (data.choices && data.choices.length > 0) {
            data.choices.forEach((choice, index) => {
              if (choice.next && nodeIdMap[choice.next]) {
                newEdges.push({
                  id: uuidv4(),
                  source: sourceId,
                  target: nodeIdMap[choice.next],
                  sourceHandle: `choice-${index}`,
                  label: choice.text,
                  deletable: true,
                  style: { strokeWidth: 1.5 },
                  labelStyle: { fontSize: 10 },
                  data: { choiceIndex: index },
                });
              }
            });
          }
          // Handle direct 'next' connections
          else if (data.next && nodeIdMap[data.next]) {
            newEdges.push({
              id: uuidv4(),
              source: sourceId,
              target: nodeIdMap[data.next],
              sourceHandle: "default",
              label: "Next",
              style: { strokeWidth: 1.5 },
              labelStyle: { fontSize: 10 },
              data: { choiceIndex: null },
            });
          }
        });

        setNodes(newNodes);
        setEdges(newEdges);
      } catch (error) {
        console.error("Error importing JSON:", error);
        alert("ไม่สามารถนำเข้าไฟล์ได้ โปรดตรวจสอบรูปแบบไฟล์");
      }

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    };
  };

  // Handle node update
  const updateNode = () => {
    if (editingNode) {
      setNodes((nds) =>
        nds.map((node) =>
          node.id === editingNode
            ? {
                ...node,
                data: {
                  ...node.data,
                  text: newNodeText,
                  choices: newNodeChoices.map((choice) => ({
                    ...choice,
                    id: uuidv4(),
                    function_name: choice.function_name || null,
                  })),
                  isEnding: isNodeEnding,
                  function_name: nodeFunctionName,
                  speaker: selectedSpeaker,
                  is_me: isMe,
                  onEdit: node.data.onEdit,
                  onDelete: node.data.onDelete,
                },
              }
            : node
        )
      );
      setIsPopupOpen(false);
      setEditingNode(null);
    } else {
      addNode();
    }
  };

  // Add character management functions
  const addCharacter = () => {
    if (newCharacterName.trim() && newCharacterId.trim()) {
      // Check if ID already exists
      if (characters.some((char) => char.id === newCharacterId)) {
        alert("ID นี้ถูกใช้แล้ว กรุณาใช้ ID อื่น");
        return;
      }

      setCharacters([
        ...characters,
        {
          id: newCharacterId.trim(),
          name: newCharacterName.trim(),
        },
      ]);
      setNewCharacterName("");
      setNewCharacterId("");
    }
  };

  const removeCharacter = (id: string) => {
    setCharacters(characters.filter((char) => char.id !== id));
  };

  // Update handleNodeContextMenu function
  const onNodeContextMenu = useCallback(
    (event: React.MouseEvent, node: Node<NodeData>) => {
      const menu = handleNodeContextMenu(event, node, reactFlowInstance);
      if (menu) {
        setContextMenu(menu);
      }
    },
    [reactFlowInstance]
  );

  // Update handlePlayNode to be memoized
  const handlePlayNode = (nodeId: string) => {
    setStartNodeId(nodeId);
  };

  // Move CustomNode component definition outside of render
  const CustomNodeComponent = useCallback(
    (props: any) => (
      <CustomNode
        {...props}
        storyData={{ characters }}
        onNodeContextMenu={onNodeContextMenu}
        onPlayNode={handlePlayNode}
      />
    ),
    [characters, onNodeContextMenu, handlePlayNode]
  );

  // Update nodeTypes with memoization
  const nodeTypes = useMemo(
    () => ({
      custom: CustomNodeComponent,
    }),
    []
  );

  // Add these new states at the beginning of StoryFlow component
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    show: boolean;
    flowPosition?: { x: number; y: number };
    nodeId?: string;
  }>({ x: 0, y: 0, show: false });

  // Add new state for clipboard
  const [copiedNode, setCopiedNode] = useState<Node<NodeData> | null>(null);

  // Add this function to handle right click
  const onContextMenu = useCallback(
    (event: React.MouseEvent) => {
      event.preventDefault();
      const bounds = event.currentTarget.getBoundingClientRect();

      if (reactFlowInstance) {
        const position = reactFlowInstance.screenToFlowPosition({
          x: event.clientX - bounds.left,
          y: event.clientY - bounds.top,
        });

        setContextMenu({
          x: event.clientX - bounds.left,
          y: event.clientY - bounds.top,
          show: true,
          flowPosition: position,
        });
      }
    },
    [reactFlowInstance]
  );

  // Add click handler to hide context menu
  useEffect(() => {
    const hideContextMenu = () => {
      setContextMenu({ x: 0, y: 0, show: false });
    };

    document.addEventListener("click", hideContextMenu);
    return () => {
      document.removeEventListener("click", hideContextMenu);
    };
  }, []);

  const copyNode = useCallback(
    (nodeId: string) => {
      const nodeToCopy = nodes.find((n) => n.id === nodeId);
      if (nodeToCopy) {
        setCopiedNode(nodeToCopy);
        setContextMenu({ x: 0, y: 0, show: false });
      }
    },
    [nodes]
  );

  const pasteNode = useCallback(
    (position: { x: number; y: number }) => {
      if (!copiedNode) return;

      const id = uuidv4();
      const newNode: Node<NodeData> = {
        ...copiedNode,
        id,
        position: position,
        data: {
          ...copiedNode.data,
          onEdit: (nodeId: string) => editNode(nodeId),
          onDelete: (nodeId: string) => deleteNode(nodeId),
        },
      };

      setNodes((nds) => [...nds, newNode]);
      setContextMenu({ x: 0, y: 0, show: false });
    },
    [copiedNode, deleteNode, editNode, setNodes]
  );

  return (
    <div className="w-screen h-screen flex flex-col items-center bg-gray-100">
      <div className="w-full bg-white shadow p-2 flex justify-between items-center">
        <h2 className="text-lg font-bold">🎭 Story Editor</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setShowCharacterModal(true)}
            className="bg-pink-500 text-white px-2 py-1 text-sm rounded"
          >
            👥 จัดการตัวละคร
          </button>
          <button
            onClick={() => openPopup()}
            className="bg-blue-500 text-white px-2 py-1 text-sm rounded"
          >
            ➕ เพิ่มบทสนทนา
          </button>
          <button
            onClick={previewStory}
            className="bg-yellow-500 text-white px-2 py-1 text-sm rounded"
          >
            ▶️ ทดสอบ
          </button>
          <button
            onClick={exportAsJson}
            className="bg-green-500 text-white px-2 py-1 text-sm rounded"
          >
            📥 Export
          </button>
          <button
            onClick={openImportDialog}
            className="bg-purple-500 text-white px-2 py-1 text-sm rounded"
          >
            📤 Import
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={importFromJson}
            accept=".json"
            className="hidden"
          />
        </div>
      </div>

      {/* Node edit/add popup */}
      {isPopupOpen && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white p-4 rounded shadow-lg w-96">
            <h3 className="text-lg font-semibold mb-3">
              {editingNode ? "แก้ไขบทสนทนา" : "เพิ่มบทสนทนา"}
            </h3>
            <div className="mb-3">
              <label htmlFor="node-text" className="block mb-1 text-sm">
                ข้อความ:
              </label>
              <textarea
                id="node-text"
                value={newNodeText}
                onChange={(e) => setNewNodeText(e.target.value)}
                className="p-2 border border-gray-300 rounded w-full h-20 text-sm"
              />
            </div>
            <div className="mb-3">
              <label htmlFor="node-text" className="block mb-1 text-sm">
                Function Name (ชื่อฟังก์ชัน สำหรับ tigger ในเกม):
              </label>
              <input
                id="node-text"
                value={nodeFunctionName}
                onChange={(e) => setNodeFunctionName(e.target.value)}
                className="p-2 border border-gray-300 rounded w-full text-sm"
              />
            </div>
            <div className="mb-3">
              <label htmlFor="node-choices" className="block mb-1 text-sm">
                ตัวเลือก:
              </label>
              <div className="space-y-2">
                {newNodeChoices.map((choice, index) => (
                  <div key={index} className="flex gap-2">
                    <div className="flex-1 space-y-2">
                      <input
                        type="text"
                        value={choice.text}
                        onChange={(e) => {
                          const updatedChoices = [...newNodeChoices];
                          updatedChoices[index] = {
                            ...updatedChoices[index],
                            text: e.target.value,
                          };
                          setNewNodeChoices(updatedChoices);
                        }}
                        className="p-2 border border-gray-300 rounded w-full text-sm"
                        placeholder={`ตัวเลือก ${index + 1}`}
                      />
                      <input
                        type="text"
                        value={choice.function_name || ""}
                        onChange={(e) => {
                          const updatedChoices = [...newNodeChoices];
                          updatedChoices[index] = {
                            ...updatedChoices[index],
                            function_name: e.target.value,
                          };
                          setNewNodeChoices(updatedChoices);
                        }}
                        className="p-2 border border-gray-300 rounded w-full text-sm"
                        placeholder="Function Name"
                      />
                    </div>
                    <button
                      onClick={() => {
                        const updatedChoices = newNodeChoices.filter(
                          (_, i) => i !== index
                        );
                        setNewNodeChoices(updatedChoices);
                      }}
                      className="bg-red-100 text-red-600 px-2 h-[38px] rounded hover:bg-red-200"
                    >
                      ลบ
                    </button>
                  </div>
                ))}
                <button
                  onClick={() =>
                    setNewNodeChoices([
                      ...newNodeChoices,
                      { text: "", function_name: "" },
                    ])
                  }
                  className="bg-blue-100 text-blue-600 px-3 py-1 rounded text-sm hover:bg-blue-200"
                >
                  + เพิ่มตัวเลือก
                </button>
              </div>
            </div>
            <div className="mb-3">
              <label className="block mb-1 text-sm">ผู้พูด:</label>
              <select
                value={selectedSpeaker}
                onChange={(e) => setSelectedSpeaker(e.target.value)}
                className="p-2 border border-gray-300 rounded w-full text-sm"
              >
                <option value="">เลือกตัวละคร</option>
                {characters.map((char) => (
                  <option key={char.id} value={char.id}>
                    {char.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="mb-3">
              <label className="flex items-center text-sm">
                <input
                  type="checkbox"
                  checked={isMe}
                  onChange={(e) => setIsMe(e.target.checked)}
                  className="mr-2"
                />
                เป็นบทพูดของตัวละครเรา
              </label>
            </div>
            <div className="mb-3">
              <label className="flex items-center text-sm">
                <input
                  type="checkbox"
                  checked={isNodeEnding}
                  onChange={(e) => setIsNodeEnding(e.target.checked)}
                  className="mr-2"
                />
                ฉากจบ (Ending)
              </label>
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={updateNode}
                className="bg-blue-500 text-white px-3 py-1 rounded text-sm"
              >
                {editingNode ? "บันทึก" : "เพิ่ม"}
              </button>
              <button
                onClick={() => {
                  setIsPopupOpen(false);
                  setEditingNode(null);
                }}
                className="bg-gray-300 text-black px-3 py-1 rounded text-sm"
              >
                ยกเลิก
              </button>
            </div>
          </div>
        </div>
      )}
      {isPlayerOpen && storyData && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-50 flex justify-center items-center z-50">
          <StoryPlayer
            storyData={storyData}
            onClose={() => setIsPlayerOpen(false)}
            startNodeId={startNodeId || ""}
            onFinish={() => {
              // Restore original start node if exists
              const originalStartNode = nodes.find(
                (node) => node.data.isStartNode
              );
              if (originalStartNode) {
                setStartNodeId(originalStartNode.id);
              }
            }}
          />
        </div>
      )}

      {/* Node context menu */}
      <div className="fixed right-4 top-16 bg-white shadow-md p-2 rounded z-10">
        <h3 className="text-sm font-bold mb-2">Start Node</h3>
        <select
          value={startNodeId || ""}
          onChange={(e) => setAsStartNode(e.target.value)}
          className="w-full text-xs p-1 border rounded"
        >
          <option value="">Select start node</option>
          {nodes.map((node) => (
            <option key={node.id} value={node.id}>
              {node.data.text.substring(0, 25)}...
            </option>
          ))}
        </select>
        <div className="text-xs text-gray-500 mt-1">
          {startNodeId ? "Start node set" : "Please set a start node"}
        </div>
      </div>

      <div className="w-full h-full" onContextMenu={onContextMenu}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          snapToGrid
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onEdgesDelete={onEdgesDelete}
          onReconnectStart={onReconnectStart}
          onNodeContextMenu={onNodeContextMenu}
          onPaneContextMenu={onContextMenu}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          fitView
          minZoom={0.1}
          maxZoom={2}
          edgesFocusable={true}
          edgesUpdatable={true}
          deleteKeyCode={["Backspace", "Delete"]} // เพิ่ม prop นี้
          defaultEdgeOptions={{
            type: "smoothstep",
            animated: false,
            deletable: true,
            focusable: true, // เพิ่ม property นี้
            selected: false, // เพิ่ม property นี้
          }}
          onInit={setReactFlowInstance}
        >
          <MiniMap />
          <Controls />
          <Background />

          {/* Add Context Menu */}
          {contextMenu.show && (
            <div
              className="fixed bg-white shadow-lg rounded py-1 z-50"
              style={{
                left: contextMenu.x,
                top: contextMenu.y,
              }}
            >
              {contextMenu.nodeId ? (
                <button
                  className="w-full text-left px-4 py-2 hover:bg-gray-100 text-sm"
                  onClick={() => copyNode(contextMenu.nodeId!)}
                >
                  📋 Copy Node
                </button>
              ) : (
                <>
                  <button
                    className="w-full text-left px-4 py-2 hover:bg-gray-100 text-sm"
                    onClick={() => addNode(contextMenu.flowPosition)}
                  >
                    ➕ Add New Node
                  </button>
                  {copiedNode && (
                    <button
                      className="w-full text-left px-4 py-2 hover:bg-gray-100 text-sm"
                      onClick={() => pasteNode(contextMenu.flowPosition!)}
                    >
                      📋 Paste Node
                    </button>
                  )}
                </>
              )}
            </div>
          )}
        </ReactFlow>
      </div>

      {/* Add character management modal */}
      {showCharacterModal && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white p-4 rounded shadow-lg w-96">
            <h3 className="text-lg font-semibold mb-3">จัดการตัวละคร</h3>
            <div className="mb-4">
              <div className="space-y-2 mb-2">
                <input
                  type="text"
                  value={newCharacterId}
                  onChange={(e) => setNewCharacterId(e.target.value)}
                  className="p-2 border border-gray-300 rounded w-full"
                  placeholder="ID ตัวละคร"
                />
                <input
                  type="text"
                  value={newCharacterName}
                  onChange={(e) => setNewCharacterName(e.target.value)}
                  className="p-2 border border-gray-300 rounded w-full"
                  placeholder="ชื่อตัวละคร"
                />
                <button
                  onClick={addCharacter}
                  className="bg-blue-500 text-white px-3 py-2 rounded w-full"
                >
                  เพิ่มตัวละคร
                </button>
              </div>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {characters.map((char) => (
                  <div
                    key={char.id}
                    className="flex justify-between items-center p-2 bg-gray-50 rounded"
                  >
                    {editingCharacter === char.id ? (
                      // Editing mode
                      <div className="flex-1 flex gap-2">
                        <input
                          type="text"
                          value={editedCharacterName}
                          onChange={(e) =>
                            setEditedCharacterName(e.target.value)
                          }
                          className="p-1 border border-gray-300 rounded flex-1"
                          placeholder="ชื่อตัวละคร"
                        />
                        <button
                          onClick={saveCharacterEdit}
                          className="text-green-600 hover:text-green-800 px-2"
                        >
                          บันทึก
                        </button>
                        <button
                          onClick={() => {
                            setEditingCharacter(null);
                            setEditedCharacterName("");
                          }}
                          className="text-gray-600 hover:text-gray-800 px-2"
                        >
                          ยกเลิก
                        </button>
                      </div>
                    ) : (
                      // Display mode
                      <>
                        <div className="flex flex-col">
                          <span className="text-sm text-gray-500">
                            ID: {char.id}
                          </span>
                          <span>{char.name}</span>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => editCharacter(char.id, char.name)}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            แก้ไข
                          </button>
                          <button
                            onClick={() => removeCharacter(char.id)}
                            className="text-red-600 hover:text-red-800"
                          >
                            ลบ
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
            <button
              onClick={() => {
                setShowCharacterModal(false);
                setEditingCharacter(null);
                setNewCharacterId("");
                setNewCharacterName("");
              }}
              className="bg-gray-300 text-black px-3 py-1 rounded text-sm w-full"
            >
              ปิด
            </button>
            <div className="flex justify-between mt-4">
              <button
                onClick={exportCharacters}
                className="bg-green-500 text-white px-3 py-2 rounded"
              >
                Export Characters
              </button>
              <input
                type="file"
                ref={characterFileInputRef}
                onChange={importCharacters}
                accept=".json"
                className="hidden"
              />
              <button
                onClick={() => characterFileInputRef.current?.click()}
                className="bg-purple-500 text-white px-3 py-2 rounded"
              >
                Import Characters
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Main App component
export default function App(): React.ReactElement {
  return (
    <ReactFlowProvider>
      <StoryFlow />
    </ReactFlowProvider>
  );
}
