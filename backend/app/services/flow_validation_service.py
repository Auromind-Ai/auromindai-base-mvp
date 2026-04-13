from collections import Counter, deque
from typing import Any, Dict, List, Set


class FlowValidationService:
    @staticmethod
    def validate_flow(nodes: List[Dict[str, Any]], edges: List[Dict[str, Any]]) -> Dict[str, Any]:
        errors: List[str] = []
        warnings: List[str] = []

        node_id_counts = Counter(node.get("id") for node in nodes if node.get("id") is not None)
        node_ids = {node_id for node_id, count in node_id_counts.items() if node_id}
        node_map = {node.get("id"): node for node in nodes if node.get("id")}
        trigger_nodes = [node for node in nodes if node.get("type") == "trigger"]

        outgoing_map: Dict[str, List[Dict[str, Any]]] = {}
        reachable_node_ids: Set[str] = set()
        reachable_edge_ids: Set[str] = set()
        disconnected_node_ids: Set[str] = set()

        if len(trigger_nodes) != 1:
            if len(trigger_nodes) == 0:
                errors.append("A flow must include exactly one trigger.")
            else:
                errors.append("Only one trigger is allowed per flow.")

        if not node_ids:
            errors.append("A flow must contain at least one node.")

        for index, node in enumerate(nodes):
            if not node.get("id"):
                errors.append(f"Node at index {index} is missing an id.")

        duplicate_node_ids = [nid for nid, count in node_id_counts.items() if count > 1]
        if duplicate_node_ids:
            errors.append(
                f"Duplicate node ids found: {', '.join(sorted(set(duplicate_node_ids)))}."
            )

        edge_id_counts = Counter(edge.get("id") for edge in edges if edge.get("id") is not None)
        for index, edge in enumerate(edges):
            edge_id = edge.get("id")
            if not edge_id:
                errors.append(f"Edge at index {index} is missing an id.")
            elif edge_id_counts[edge_id] > 1:
                errors.append(f"Duplicate edge id found: {edge_id}.")

            source = edge.get("source")
            target = edge.get("target")
            missing_node = source not in node_ids or target not in node_ids
            if missing_node:
                errors.append(
                    f"Connection {edge_id or 'unknown'} points to a missing node."
                )
                continue

            if source == target:
                errors.append(
                    f"Connection {edge_id or 'unknown'} cannot point back to the same node."
                )

            if node_map[target].get("type") == "trigger":
                errors.append(
                    f"Connection {edge_id or 'unknown'} cannot target the trigger."
                )

            outgoing_map.setdefault(source, []).append(edge)

        if len(trigger_nodes) == 1:
            trigger_id = trigger_nodes[0].get("id")
            if trigger_id:
                queue: deque[str] = deque([trigger_id])
                while queue:
                    current_id = queue.popleft()
                    if current_id in reachable_node_ids:
                        continue

                    reachable_node_ids.add(current_id)
                    for edge in outgoing_map.get(current_id, []):
                        edge_id = edge.get("id")
                        if edge_id:
                            reachable_edge_ids.add(edge_id)
                        queue.append(edge.get("target"))

                if len(nodes) > 1 and not outgoing_map.get(trigger_id):
                    errors.append("No path starts from the trigger.")

        for node in nodes:
            node_id = node.get("id")
            if not node_id:
                continue

            is_connected = any(
                edge.get("source") == node_id or edge.get("target") == node_id
                for edge in edges
            )

            if node.get("type") != "trigger" and not is_connected:
                disconnected_node_ids.add(node_id)

            if trigger_nodes and node_id not in reachable_node_ids:
                disconnected_node_ids.add(node_id)

        if disconnected_node_ids:
            warnings.append(
                f"{len(disconnected_node_ids)} node{'s are' if len(disconnected_node_ids) != 1 else ' is'} disconnected or unreachable from the trigger."
            )
            errors.append("Every node must be connected to the trigger path before saving.")

        def _detect_cycle(current_id: str, visited: Set[str], stack: Set[str]) -> bool:
            if current_id not in node_ids:
                return False
            if current_id in stack:
                return True
            if current_id in visited:
                return False

            visited.add(current_id)
            stack.add(current_id)
            for edge in outgoing_map.get(current_id, []):
                if _detect_cycle(edge.get("target"), visited, stack):
                    return True
            stack.remove(current_id)
            return False

        if node_ids:
            visited: Set[str] = set()
            stack: Set[str] = set()
            for node_id in node_ids:
                if node_id not in visited and _detect_cycle(node_id, visited, stack):
                    errors.append(
                        "Flow contains a cycle. Cyclic flows are not supported and may cause infinite execution loops."
                    )
                    break

        return {
            "is_valid": len(errors) == 0,
            "errors": errors,
            "warnings": warnings,
            "reachable_node_ids": sorted(reachable_node_ids),
            "reachable_edge_ids": sorted(reachable_edge_ids),
            "disconnected_node_ids": sorted(disconnected_node_ids),
            "trigger_id": trigger_nodes[0].get("id") if len(trigger_nodes) == 1 else None,
            "outgoing_map": outgoing_map,
        }
