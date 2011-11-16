package models;

import java.io.Serializable;
import java.util.Map;

public class ResultMapModel implements Serializable {
	
	private Map<String, DataMapModel> parishMap;

	public Map<String, DataMapModel> getParishMap() {
		return parishMap;
	}

	public void setParishMap(Map<String, DataMapModel> parishMap) {
		this.parishMap = parishMap;
	}


}
