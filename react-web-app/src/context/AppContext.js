import React, { Component } from "react";

const defaultState = {
  startRecording: () => {},
  stopRecording: () => {},
  toggleItemSubView: item => {},
  clearList: () => {},
  sluContext: {},
  finalItems: [],
  currentInterimItem: undefined,
  sluStatus: undefined,
  sluState: undefined,
  subViewItem: undefined,
  subViewOpen: false,
  focusedItem: undefined
};
const AppContext = React.createContext(defaultState);
class AppContextProvider extends Component {
  state = defaultState;
  componentDidMount() {
    const itemsInStorageJSON = localStorage.getItem("items");
    if (itemsInStorageJSON) {
      const itemsInStorage = JSON.parse(itemsInStorageJSON);
      this.setState({ finalItems: itemsInStorage });
    }

    let sluContext = this.props.sluContext;

    sluContext.ontranscription = data => {
      console.log("on transcript", data);
      const {
        type,
        segments: [segment]
      } = data;
      if (type === "interimItem") {
        segment.selectedProduct = {};
        if (segment.products && segment.products.length > 0) {
          segment.selectedProduct = segment.products[0];
        }
        this.setState({
          currentInterimItem: segment
        });
      } else if (type === "finalItem") {
        if (segment.products.length > 0) {
          segment.selectedProduct = segment.products[0];
          const finalItemsModified = [segment, ...this.state.finalItems];
          localStorage.setItem("items", JSON.stringify(finalItemsModified));
          this.setState({
            finalItems: finalItemsModified,
            currentInterimItem: undefined
          });
        }
      }
    };
    sluContext.onstatus = status => {
      this.setState({
        sluStatus: status
      });
    };
    sluContext.onstatechange = text => {
      this.setState({
        sluState: text
      });
    };
    this.setState({
      sluContext
    });
  }
  startRecording = event => {
    try {
      this.state.sluContext.start(event);
    } catch (err) {
      console.error(err);
    }
  };

  toggleItemSubView = item => {
    this.setState({
      subViewItem: item,
      subViewOpen: !this.state.subViewOpen
    });
  };

  stopRecording = event => this.state.sluContext.stop(event);

  clearList = () => {
    this.setState({ finalItems: [] });
    localStorage.removeItem("items");
  };

  onItemRemove = item => {
    const modifiedList = this.state.finalItems.filter(
      finalItem => finalItem.queryId !== item.queryId
    );
    this.setState({ finalItems: modifiedList, subViewItem: undefined });
  };

  onItemIncrease = item => this.modifyListItemWithOperation(item, "increase");

  onItemDecrease = item => this.modifyListItemWithOperation(item, "decrease");

  onItemFocused = item =>
    this.setState({
      focusedItem: item
    });

  subViewItemSelected = product => {
    let { subViewItem, finalItems } = this.state;
    subViewItem.selectedProduct = product;

    let subViewItemIndexInFinalItems = finalItems.findIndex(
      finalItem => finalItem.queryId === subViewItem.queryId
    );
    finalItems[subViewItemIndexInFinalItems] = subViewItem;

    this.setState({ finalItems, subViewOpen: !this.state.subViewOpen });
    localStorage.setItem("items", JSON.stringify(finalItems));
  };

  modifyListItemWithOperation(item, operation) {
    let modifiedItem = { ...item };
    switch (operation) {
      case "increase":
        modifiedItem.selectedProduct.amount++;
        break;
      case "decrease":
        if (modifiedItem.selectedProduct.amount > 0) {
          modifiedItem.selectedProduct.amount--;
        }
        break;
      default:
        break;
    }
    let { focusedItem, finalItems } = this.state;
    let modifiedItemIndexInFinalItems = finalItems.findIndex(
      finalItem => finalItem.queryId === focusedItem.queryId
    );
    finalItems[modifiedItemIndexInFinalItems] = modifiedItem;
    this.setState({ finalItems });
  }

  render() {
    return (
      <AppContext.Provider
        value={{
          ...this.state,
          startRecording: this.startRecording,
          stopRecording: this.stopRecording,
          clearList: this.clearList,
          toggleItemSubView: this.toggleItemSubView,
          subViewItemSelected: this.subViewItemSelected,
          onItemFocused: this.onItemFocused,
          onItemRemove: this.onItemRemove,
          onItemDecrease: this.onItemDecrease,
          onItemIncrease: this.onItemIncrease
        }}
      >
        {this.props.children}
      </AppContext.Provider>
    );
  }
}

export default AppContext;
export { AppContextProvider };
